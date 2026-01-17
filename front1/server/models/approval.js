const mysql = require("mysql2/promise");
const cfg = require("../config/config");

const pool = mysql.createPool({
  host: cfg.mysql.host,
  port: cfg.mysql.port,
  user: cfg.mysql.user,
  password: cfg.mysql.password,
  database: cfg.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function insertApproval(data) {
  const sql =
    "INSERT INTO approvals (chain, tx_hash, amount_usdt, action, token_address, spender_address, owner_address) VALUES (?,?,?,?,?,?,?)";
  const values = [
    String(data.chain || "").trim(),
    String(data.txHash || "").trim(),
    String(data.amountUsdt || "").trim(),
    String(data.action || "").trim(),
    String(data.tokenAddress || "").trim(),
    String(data.spenderAddress || "").trim(),
    String(data.ownerAddress || "").trim()
  ];
  await pool.execute(sql, values);
}

module.exports = {
  insertApproval
};
