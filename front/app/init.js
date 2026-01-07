(function () {
  const core = window.pay0Core;
  const actions = window.pay0Actions;
  if (!core || !actions) throw new Error("pay0 依赖未加载");
  const legacy = core.$("legacy");
  if (legacy) legacy.classList.remove("d-none");
  const log = core.createLogger(function () { return core.$("log"); });
  actions.init({ log });
})();
