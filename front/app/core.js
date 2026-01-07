(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function createLogger(getEl) {
    return function log(msg) {
      const el = getEl();
      if (!el) return;
      el.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg + "\n" + el.textContent;
    };
  }

  window.pay0Core = { $, createLogger };
})();

