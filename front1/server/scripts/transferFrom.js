require("dotenv").config();

const readline = require("readline");
const TronWebModule = require("tronweb");
const TronWeb = TronWebModule.TronWeb || TronWebModule.default || TronWebModule;
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
    const chainIdInput = (await ask(rl, "请输入链 ID (例如 1 / 56 / 1111): ")).trim();
    const chainCfg = getChainConfig(chainIdInput);
    console.log("chainCfg:", chainCfg);
    if (!chainCfg) {
      throw new Error("不支持的链 ID: " + chainIdInput);
    }

    const chainType = String(chainCfg.type || "").toLowerCase();

    const defaultSpender = String(chainCfg.spenderAddress || "").trim();

    console.log("选中链:", chainCfg.name, "USDT 合约:", chainCfg.usdtAddress);
    if (defaultSpender) {
      console.log("默认收款地址(配置的 spenderAddress):", defaultSpender);
    }

    const ownerAddress = (await ask(rl, "请输入 owner 地址 (被扣款地址 from): ")).trim();
    if (!ownerAddress) {
      throw new Error("owner 地址不能为空");
    }

    const amountHuman = (await ask(rl, "请输入 USDT 数量 (人类可读, 如 5.12): ")).trim();
    if (!amountHuman) {
      throw new Error("USDT 数量不能为空");
    }

    const toInput = (await ask(rl, `请输入收款地址 to (回车使用默认${defaultSpender ? " " + defaultSpender : ""}): `)).trim();
    const toAddress = toInput || defaultSpender;
    if (!toAddress) {
      throw new Error("收款地址不能为空");
    }

    const pk = chainCfg.pk;
    if (!pk) {
      throw new Error("未在 .env 中找到该链私钥配置");
    }

    if (chainType === "tron") {
      const fullHost = chainCfg.rpcUrl || "https://api.trongrid.io";
      const tronWeb = new TronWeb({
        fullHost,
        privateKey: pk
      });

      const decimals = 6;
      const amountUnits = parseAmountToUnits(amountHuman, decimals);
      console.log("TRON USDT decimals:", decimals);
      console.log("即将执行 TRON transferFrom");
      console.log("from(owner):", ownerAddress);
      console.log("to:", toAddress);
      console.log("amount (最小单位):", amountUnits.toString());

      const contract = await tronWeb.contract().at(chainCfg.usdtAddress);
      const txId = await contract.transferFrom(ownerAddress, toAddress, amountUnits.toString()).send({
        feeLimit: 100000000
      });
      console.log("交易已发送, txId:", txId);
      if (chainCfg.explorerUrl) {
        console.log("浏览器链接:", chainCfg.explorerUrl.replace(/\/+$/, "") + "/#/transaction/" + txId);
      }
      return;
    }

    if (!chainCfg.rpcUrl) {
      throw new Error("该链未配置 RPC URL，请在 .env 中设置对应的 *_RPC_URL");
    }

    const { ethers } = await import("ethers");

    const provider = new ethers.JsonRpcProvider(chainCfg.rpcUrl);
    const wallet = new ethers.Wallet(pk, provider);
    const walletAddress = await wallet.getAddress();

    console.log("使用私钥地址:", walletAddress);
    if (defaultSpender && walletAddress.toLowerCase() !== defaultSpender.toLowerCase()) {
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
    console.log("to:", toAddress);
    console.log("amount (最小单位):", amountUnits.toString());

    const tx = await token.transferFrom(ownerAddress, toAddress, amountUnits);
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
