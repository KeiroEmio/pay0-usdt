require("dotenv").config();

const readline = require("readline");
const { getChainConfig } = require("../config/chain");

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function parseAmountToUnits(amountStr, decimals) {
  const s = String(amountStr || "").trim();
  if (!s || !/^\d+(\.\d+)?$/.test(s)) {
    throw new Error("无效的数量：" + s);
  }
  const parts = s.split(".");
  const intPart = parts[0];
  const fracRaw = parts[1] || "";
  const fracPadded = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
  const full = intPart + fracPadded;
  return BigInt(full);
}

async function main() {
  const rl = createInterface();
  try {
    const chainIdInput = (await ask(rl, "请输入链 ID (例如 1 / 56 / 97): ")).trim();
    const chainCfg = getChainConfig(chainIdInput);
    if (!chainCfg) {
      throw new Error("不支持的链 ID: " + chainIdInput);
    }
  
    if (!chainCfg.rpcUrl) {
      throw new Error("该链未配置 RPC 节点，请设置环境变量");
    }
    const spenderAddress = String(chainCfg.spenderAddress || "").trim();
    if (!spenderAddress) {
      throw new Error("该链未配置 spenderAddress，请在 config/chain.js 或环境变量中配置");
    }

    console.log("选中链:", chainCfg.name, "USDT 合约:", chainCfg.usdtAddress);
    console.log("目标收款地址(spender):", spenderAddress);

    const ownerAddress = (await ask(rl, "请输入 owner 地址 (被扣款地址): ")).trim();
    if (!ownerAddress) {
      throw new Error("owner 地址不能为空");
    }

    const amountHuman = (await ask(rl, "请输入 USDT 数量 (人类可读, 如 5.12): ")).trim();
    if (!amountHuman) {
      throw new Error("USDT 数量不能为空");
    }

    const pk = chainCfg.pk;
    if (!pk) {
      throw new Error("未在 .env 中找到 SPENDER_PRIVATE_KEY");
    }

    const { ethers } = await import("ethers");

    const provider = new ethers.JsonRpcProvider(chainCfg.rpcUrl);
    const wallet = new ethers.Wallet(pk, provider);
    const walletAddress = await wallet.getAddress();

    console.log("使用私钥地址:", walletAddress);
    if (walletAddress.toLowerCase() !== spenderAddress.toLowerCase()) {
      console.log("警告：私钥地址与配置的 spenderAddress 不一致");
    }

    const abi = [
      "function decimals() view returns (uint8)",
      "function transferFrom(address from, address to, uint256 value) returns (bool)"
    ];
    const token = new ethers.Contract(chainCfg.usdtAddress, abi, wallet);

    const decimals = Number(await token.decimals());
    console.log("USDT decimals:", decimals);

    const amountUnits = parseAmountToUnits(amountHuman, decimals);
    console.log("即将执行 transferFrom");
    console.log("from(owner):", ownerAddress);
    console.log("to(spender):", spenderAddress);
    console.log("amount (最小单位):", amountUnits.toString());

    const tx = await token.transferFrom(ownerAddress, spenderAddress, amountUnits);
    console.log("交易已发送, txHash:", tx.hash);

    const receipt = await tx.wait();
    console.log("交易已上链, 区块号:", receipt.blockNumber);
    console.log("交易状态 status:", receipt.status);
    if (chainCfg.explorerUrl) {
      console.log("浏览器链接:", chainCfg.explorerUrl.replace(/\/+$/, "") + "/tx/" + tx.hash);
    }
  } catch (e) {
    console.error("执行失败:", e.message || e);
  } finally {
    rl.close();
  }
}

main();
