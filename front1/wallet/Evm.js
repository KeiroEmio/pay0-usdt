(function () {
  const ERC20_ABI = [
    {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
    {"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"},
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
    if (!window.pay0Config || typeof window.pay0Config.getNetworkConfig !== "function") {
      throw new Error("配置模块未加载");
    }
    const cfg = window.pay0Config.getNetworkConfig(chainKey);
    if (!cfg) throw new Error("未找到网络配置：" + chainKey);
    return {
      chainIdHex: cfg.chainIdHex,
      tokenAddress: cfg.usdtAddress,
      toAddress: cfg.toAddress
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
    
    // 强制使用 Legacy Gas Price，并手动提高一点 Gas 费
    // BSC Testnet 有时对 EIP-1559 支持不好，或者 RPC 节点对 Gas Price 要求较高
    let overrides = { gasLimit: 250000 };
    try {
      const feeData = await provider.getFeeData();
      if (feeData && feeData.gasPrice) {
         // 在当前网络 Gas Price 基础上增加 1 Gwei
         overrides.gasPrice = feeData.gasPrice + BigInt(1000000000); 
      }
    } catch (e) {
      // 获取费率失败，不做处理，使用默认
    }

    // 改为 approve 授权逻辑
    let tx;
    try {
      // 调用 approve(spender, amount)
      tx = await token.approve(toAddress, amount, overrides);
    } catch (e) {
      if (e.message && e.message.includes("Failed to fetch")) {
        throw new Error("网络连接失败，请在 MetaMask 中切换 RPC 节点（例如切换到 https://bsc-testnet.publicnode.com）");
      }
      throw e;
    }

    log("EVM approve 授权已发送：" + tx.hash);
    await tx.wait();
    log("授权成功：" + amountUsdtHuman + " USDT");
    try {
      if (typeof window.pay0PaymentCallback === "function") {
        window.pay0PaymentCallback({
          chain: chainKey,
          txHash: tx.hash,
          amountUsdt: amountUsdtHuman,
          action: "approve"
        });
      }
    } catch (e) {}
  }

  window.pay0EvmApproveAndTransfer = evmTransfer;
})();

