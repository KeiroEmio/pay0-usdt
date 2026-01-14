(function () {
  function getConfig() {
    return window.pay0Config || {};
  }

  function getApiBase() {
    var cfg = getConfig();
    var apiBaseRaw = cfg.apiBase || "";
    var apiBase = String(apiBaseRaw || "").replace(/\/+$/, "");
    return apiBase;
  }

  async function postApproval(body) {
    var cfg = getConfig();
    var apiBase = getApiBase();
    var url = apiBase ? apiBase + "/api/approval" : "/api/approval";
    var headers = { "Content-Type": "application/json" };
    var token = cfg.apiToken || "";
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
    var res = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      var text = "";
      try {
        text = await res.text();
      } catch (e) {}
      throw new Error("api error " + res.status + " " + text);
    }
    try {
      return await res.json();
    } catch (e) {
      return {};
    }
  }

  if (!window.pay0Api) {
    window.pay0Api = {};
  }
  window.pay0Api.postApproval = postApproval;
})();

