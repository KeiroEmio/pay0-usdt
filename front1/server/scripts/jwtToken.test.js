const jwt = require("jsonwebtoken");
const cfg = require("../config/config");

const secret = cfg.jwt.secret;

const payload = {
  role: "frontend",
  issuedAt: new Date().toISOString()
};

const token = jwt.sign(payload, secret, { expiresIn: "365d" });

console.log("JWT token generated for frontend:");
console.log(token);
