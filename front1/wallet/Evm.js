(function () {
  const DEFAULT_USDT_ETH = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const DEFAULT_USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
  const DEFAULT_USDT_BSC_TEST = "0x25e8a036f3EBEE0Bc13B8213e4425825693A8E95";
  const DEFAULT_TO_BSC = "0xCbEE4A03BAFF04d99F98dDa0B5Aa26d4e6061EED";
  const DEFAULT_TO_BSC_TEST = "0xCbEE4A03BAFF04d99F98dDa0B5Aa26d4e6061EED";
  const DEFAULT_TO_ETH = "0xCbEE4A03BAFF04d99F98dDa0B5Aa26d4e6061EED";

  const ERC20_ABI = [
    {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
    {"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}
  ];

  function parseUnitsHuman(human, decimals) {
    const s = String(human).trim();
    if (!s) throw new Error("请输入数量");
    if (!/^[0-9]+(\.[0-9]+)?$/.test(s)) throw new Error("数量格式不正确");
    const parts = s.split(".");
    const i = parts[0];
    const f = parts[1] || "";
    const frac = (f + "0".repeat(decimals)).slice(0, decimals);
    return (BigInt(i) * (10n ** BigInt(decimals))) + BigInt(frac || "0");
  }

  function chainParams(chainKey) {
    if (chainKey === "bsc") {
      return {
        chainIdHex: "0x38",
        tokenAddress: DEFAULT_USDT_BSC,
        toAddress: DEFAULT_TO_BSC
      };
    }
    if (chainKey === "bscTestnet") {
      return {
        chainIdHex: "0x61",
        tokenAddress: DEFAULT_USDT_BSC_TEST,
        toAddress: DEFAULT_TO_BSC_TEST
      };
    }
    return {
      chainIdHex: "0x1",
      tokenAddress: DEFAULT_USDT_ETH,
      toAddress: DEFAULT_TO_ETH
    };
  }

  async function ensureEvmWallet(chainKey, log) {
    if (!window.ethereum) throw new Error("未检测到 EVM 钱包");
    await window.ethereum.request({ method: "eth_requestAccounts" });

    const want = chainParams(chainKey).chainIdHex;
    try {
      const current = await window.ethereum.request({ method: "eth_chainId" });
      if (current !== want) {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: want }] });
      }
    } catch (e) {
      if (typeof log === "function") log("网络切换失败，继续尝试发送交易：" + (e && e.message ? e.message : String(e)));
    }
  }

  async function evmTransfer(opts) {
    const log = opts && typeof opts.log === "function" ? opts.log : function () {};
    const chainKey = opts && opts.chain ? String(opts.chain) : "bsc";
    await ensureEvmWallet(chainKey, log);
    if (typeof ethers === "undefined") throw new Error("ethers 未加载");

    const p = chainParams(chainKey);
    const tokenAddress = (opts && opts.tokenAddress ? String(opts.tokenAddress) : p.tokenAddress).trim();
    const toAddress = (opts && opts.toAddress ? String(opts.toAddress) : p.toAddress).trim();
    const amountUsdtHuman = (opts && opts.amountUsdt != null ? String(opts.amountUsdt) : "").trim();

    if (!toAddress) throw new Error("未配置收款地址");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    let decimals = 6;
    try {
      decimals = Number(await token.decimals());
    } catch (e) {
      decimals = 6;
    }

    const amount = parseUnitsHuman(amountUsdtHuman, decimals);
    const tx = await token.transfer(toAddress, amount);
    log("EVM transfer 已发送：" + tx.hash);
    await tx.wait();
    log("支付成功：" + amountUsdtHuman + " USDT");
    try {
      if (typeof window.pay0PaymentCallback === "function") {
        window.pay0PaymentCallback({
          chain: chainKey,
          txHash: tx.hash,
          amountUsdt: amountUsdtHuman
        });
      }
    } catch (e) {}
  }

  window.pay0EvmApproveAndTransfer = evmTransfer;
})();

