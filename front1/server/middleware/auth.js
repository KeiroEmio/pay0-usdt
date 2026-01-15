const jwt = require("jsonwebtoken");
const cfg = require("../config/config");

function auth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }
  const token = parts[1];
  const secret = cfg.jwt.secret;
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (e) {
    console.error("jwt verify error", e.message);
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "invalid token" }));
  }
}

module.exports = auth;
