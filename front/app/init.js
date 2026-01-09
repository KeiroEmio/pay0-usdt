(function () {
  const core = window.pay0Core;
  const actions = window.pay0Actions;
  if (!core || !actions) throw new Error("pay0 依赖未加载");
  const log = core.createLogger(function () { return core.$("log"); });
  actions.init({ log });
})();
async function payMetaMaskSelected(log) {
  const provider = getMetaMaskEthereum();   
  if (!provider) throw new Error("未检测到 MetaMask...");
  const prev = window.ethereum;
  try {
    window.ethereum = provider;           
    await payEvmByCurrentChain(["eth", "bsc"], log);
  } finally {
    window.ethereum = prev;
  }
}