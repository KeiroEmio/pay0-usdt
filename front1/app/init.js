(function () {
  const core = window.pay0Core;
  const actions = window.pay0Actions;
  if (!core || !actions) throw new Error("pay0 依赖未加载");
  const log = core.createLogger(function () { return core.$("log"); });
  actions.init({ log });
})();

