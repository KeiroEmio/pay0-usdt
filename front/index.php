<?php

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');

?><!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>USDT 支付 Demo</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    #log { white-space: pre-wrap; background: #0b1020; color: #e5e7eb; padding: 12px; border-radius: 12px; min-height: 160px; }
    .walletIcon { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; }
  </style>
</head>
<body>
  <div class="modal fade" id="walletModal" tabindex="-1" aria-labelledby="walletModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <div class="modal-title fw-semibold" id="walletModalLabel">USDT - 请选择付款使用的钱包</div>
            <div class="text-body-secondary small">点击钱包后会弹出对应钱包进行签名</div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭" id="btnCloseModal"></button>
        </div>
        <div class="modal-body">
          <div class="list-group">
            <button type="button" class="list-group-item list-group-item-action" id="btnWalletTokenPocket">
              <div class="d-flex align-items-center gap-3">
                <img class="walletIcon" src="https://tokenpocket.pro/favicon.ico" alt="TokenPocket" />
                <div class="flex-grow-1">
                  <div class="fw-semibold">TokenPocket</div>
                  <div class="text-body-secondary small">TRC20 / ERC20 / BEP20</div>
                </div>
                <span class="badge text-bg-danger">推荐</span>
              </div>
            </button>
            <button type="button" class="list-group-item list-group-item-action" id="btnWalletTronLink">
              <div class="d-flex align-items-center gap-3">
                <img class="walletIcon" src="https://www.tronlink.org/favicon.ico" alt="TronLink" />
                <div class="flex-grow-1">
                  <div class="fw-semibold">TronLink</div>
                  <div class="text-body-secondary small">TRC20</div>
                </div>
                <span class="badge text-bg-secondary">Tron</span>
              </div>
            </button>
            <button type="button" class="list-group-item list-group-item-action" id="btnWalletBitget">
              <div class="d-flex align-items-center gap-3">
                <img class="walletIcon" src="https://web3.bitget.com/favicon.ico" alt="Bitget Wallet" />
                <div class="flex-grow-1">
                  <div class="fw-semibold">Bitget Wallet / BitKeep</div>
                  <div class="text-body-secondary small">TRC20 / ERC20</div>
                </div>
              </div>
            </button>
            <button type="button" class="list-group-item list-group-item-action" id="btnWalletTrust">
              <div class="d-flex align-items-center gap-3">
                <img class="walletIcon" src="https://trustwallet.com/assets/images/favicon.png" alt="Trust Wallet" />
                <div class="flex-grow-1">
                  <div class="fw-semibold">Trust Wallet</div>
                  <div class="text-body-secondary small">ERC20</div>
                </div>
              </div>
            </button>
            <button type="button" class="list-group-item list-group-item-action" id="btnWalletMetaMask">
              <div class="d-flex align-items-center gap-3">
                <img class="walletIcon" src="https://metamask.io/images/favicon-256.png" alt="MetaMask" />
                <div class="flex-grow-1">
                  <div class="fw-semibold">MetaMask</div>
                  <div class="text-body-secondary small">ERC20 / BEP20</div>
                </div>
                <span class="badge text-bg-primary">EVM</span>
              </div>
            </button>
          </div>
          <div class="text-body-secondary small mt-3">桌面端需要安装对应插件；手机端建议用钱包内置浏览器打开本页。</div>
        </div>
      </div>
    </div>
  </div>

  <div id="legacy" class="d-none">
  <div class="card">
    <div class="row">
      <button id="btnConnect">选择钱包</button>
      <div class="muted">EVM 地址：<span id="addr" class="mono">未连接</span></div>
      <div class="muted">EVM 链：<span id="chain" class="mono">未知</span></div>
      <div class="muted">Tron 地址：<span id="tronAddr" class="mono">未连接</span></div>
    </div>
  </div>

  <div id="evmSection" class="hide">
    <div class="row">
      <div>
        <label>选择链</label>
        <select id="network">
          <option value="bsc">BSC Mainnet (56)</option>
          <option value="bscTestnet">BSC Testnet (97)</option>
          <option value="eth">Ethereum Mainnet (1)</option>
        </select>
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnSwitch">切换/添加网络</button>
      </div>
    </div>
    <div style="margin-top:12px" class="row">
      <div>
        <label>Token 合约地址（默认 USDT，可自行修改）</label>
        <input id="token" class="mono" placeholder="0x..." />
      </div>
      <div>
        <label>Token 信息</label>
        <input id="tokenInfo" readonly value="-" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnLoadToken">读取 Token 信息</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">Approve</h3>
    <div class="row">
      <div>
        <label>Spender 地址（被授权者）</label>
        <input id="spender" class="mono" placeholder="0x..." />
      </div>
      <div>
        <label>数量（人类可读，如 1000）</label>
        <input id="approveAmount" placeholder="1000" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnApprove" disabled>签名并发送 approve</button>
      </div>
    </div>
    <div style="margin-top:10px" class="row">
      <div>
        <label>Allowance 查询（owner=当前钱包，spender=上面地址）</label>
        <input id="allowance" readonly value="-" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnAllowance" disabled>查询 allowance</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">Transfer</h3>
    <div class="row">
      <div>
        <label>Recipient 地址（收款地址）</label>
        <input id="recipient" class="mono" placeholder="0x..." />
      </div>
      <div>
        <label>数量（人类可读，如 10）</label>
        <input id="transferAmount" placeholder="10" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnTransfer" disabled>签名并发送 transfer</button>
      </div>
    </div>
    <div style="margin-top:10px" class="row">
      <div>
        <label>当前钱包 Token 余额</label>
        <input id="balance" readonly value="-" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnBalance" disabled>查询余额</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">TRON / TRC20</h3>
    <div class="muted">选择 TronLink / TokenPocket(TRON) 后可用</div>
    <div style="margin-top:12px" class="row">
      <div>
        <label>TRC20 Token 地址（默认 USDT，可自行修改）</label>
        <input id="tronToken" class="mono" placeholder="T..." value="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" />
      </div>
      <div>
        <label>Token 信息</label>
        <input id="tronTokenInfo" readonly value="-" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnTronLoadToken" disabled>读取 Token 信息</button>
      </div>
    </div>

    <div style="margin-top:12px" class="row">
      <div>
        <label>Spender 地址（被授权者）</label>
        <input id="tronSpender" class="mono" placeholder="T..." />
      </div>
      <div>
        <label>数量（人类可读，如 1000）</label>
        <input id="tronApproveAmount" placeholder="1000" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnTronApprove" disabled>签名并发送 approve</button>
      </div>
    </div>

    <div style="margin-top:10px" class="row">
      <div>
        <label>Allowance 查询（owner=当前钱包，spender=上面地址）</label>
        <input id="tronAllowance" readonly value="-" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnTronAllowance" disabled>查询 allowance</button>
      </div>
    </div>

    <div style="margin-top:12px" class="row">
      <div>
        <label>Recipient 地址（收款地址）</label>
        <input id="tronRecipient" class="mono" placeholder="T..." />
      </div>
      <div>
        <label>数量（人类可读，如 10）</label>
        <input id="tronTransferAmount" placeholder="10" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnTronTransfer" disabled>签名并发送 transfer</button>
      </div>
    </div>

    <div style="margin-top:10px" class="row">
      <div>
        <label>当前钱包 Token 余额</label>
        <input id="tronBalance" readonly value="-" />
      </div>
      <div>
        <label>&nbsp;</label>
        <button id="btnTronBalance" disabled>查询余额</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">日志</h3>
    <div id="log" class="mono"></div>
  </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/tronweb@6.1.1/dist/TronWeb.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js"></script>
  <script src="/wallet/Evm.php?js=1"></script>
  <script src="/wallet/TronLink.php?js=1"></script>
  <script src="/wallet/TokenPocket.php?js=1"></script>
  <script src="/app/core.js"></script>
  <script src="/app/actions.js"></script>
  <script src="/app/init.js"></script>
</body>
</html>
