const { Pool } = require("pg");
const cfg = require("../config/config");

const pool = new Pool({
  host: cfg.pg.host,
  port: cfg.pg.port,
  user: cfg.pg.user,
  password: cfg.pg.password,
  database: cfg.pg.database
});

async function insertApproval(data) {
  const sql =
    "INSERT INTO approvals (chain, tx_hash, amount_usdt, action, token_address, spender_address, owner_address) VALUES ($1,$2,$3,$4,$5,$6,$7)";
  const values = [
    String(data.chain || "").trim(),
    String(data.txHash || "").trim(),
    String(data.amountUsdt || "").trim(),
    String(data.action || "").trim(),
    String(data.tokenAddress || "").trim(),
    String(data.spenderAddress || "").trim(),
    String(data.ownerAddress || "").trim()
  ];
  await pool.query(sql, values);
}

module.exports = {
  insertApproval
};

