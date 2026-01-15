require("dotenv").config();

const { createClient } = require("redis");
const cfg = require("./config/config");
const { getChainConfig } = require("./config/chain");

const redisClient = createClient({
  socket: {
    host: cfg.redis.host,
    port: cfg.redis.port
  },
  password: cfg.redis.password || undefined,
  database: cfg.redis.db
});

redisClient.on("error", (err) => {
  console.error("redis error", err.message);
});

const THRESHOLD_USDT = BigInt(process.env.AMOUNT_USDT || "0");

function resolveChainId(chainKey) {
  const key = String(chainKey).toLowerCase();
  if (key === "tron") return "tron";
  if (key === "bsc") return "56";
  if (key === "bsctestnet") return "97";
  if (key === "eth" || key === "ethereum" || key === "erc20") return "1";
  return key;
}

async function getEvmTokenBalance(chainConfig, ownerAddress) {
  if (!chainConfig.rpcUrl) {
    return 0n;
  }
  const rpcUrl = chainConfig.rpcUrl;
  const tokenAddress = chainConfig.usdtAddress;
  if (!tokenAddress) {
    return 0n;
  }
  let addr = String(ownerAddress || "");
  if (!addr) {
    return 0n;
  }
  addr = addr.toLowerCase();
  if (addr.startsWith("0x")) {
    addr = addr.slice(2);
  }
  if (addr.length !== 40) {
    return 0n;
  }
  const padded = addr.padStart(64, "0");
  const data = "0x70a08231" + padded;

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [
      {
        to: tokenAddress,
        data: data
      },
      "latest"
    ]
  };

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (json.error || !json.result) {
    return 0n;
  }
  try {
    const raw = BigInt(json.result);
    const decimals = 6n;
    const divisor = 10n ** decimals;
    const usdt = raw / divisor;
    return usdt;
  } catch (e) {
    return 0n;
  }
}

async function getUsdtBalance(chainKey, chainConfig, ownerAddress) {
  if (!chainConfig) {
    return 0n;
  }
  if (chainConfig.type === "evm") {
    return getEvmTokenBalance(chainConfig, ownerAddress);
  }
  return 0n;
}

async function scanOnce() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  const keys = await redisClient.keys("usdt:owners:*");
  for (const key of keys) {
    const chainKey = key.slice("usdt:owners:".length);
    const chainId = resolveChainId(chainKey);
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      continue;
    }
    const owners = await redisClient.sMembers(key);
    for (const owner of owners) {
      try {
        const balanceUsdt = await getUsdtBalance(chainKey, chainConfig, owner);
        if (balanceUsdt > THRESHOLD_USDT) {

          //notify: .....
          console.log(
            "[USDT-HIGH-BALANCE]",
            "chainKey=" + chainKey,
            "chainName=" + chainConfig.name,
            "owner=" + owner,
            "usdt=" + balanceUsdt.toString()
          );
        }
      } catch (e) {
        console.error("scan balance error", chainKey, owner, e.message);
      }
    }
  }
}

async function main() {
  try {
    await scanOnce();
    setInterval(() => {
      scanOnce().catch((e) => {
        console.error("scanOnce error", e.message);
      });
    }, 60 * 1000);
  } catch (e) {
    console.error("cron main error", e.message);
    process.exit(1);
  }
}

main();
