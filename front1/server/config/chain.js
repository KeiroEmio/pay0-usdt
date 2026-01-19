const tronConfig = {
  chainId: "tron",
  name: "TRON Mainnet",
  type: "tron",
  rpcUrl: "https://api.trongrid.io/",
  usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  explorerUrl: "https://tronscan.org",
  spenderAddress: "TA15gtkcGHEUeyAioAbPwdrXD22mpu1CP8",
  pk: process.env.TRON_SPENDER_PRIVATE_KEY || ""
};

const chains = {
  tron: tronConfig,
  "1111": tronConfig,
  "1": {
    chainId: 1,
    name: "Ethereum Mainnet",
    type: "evm",
    rpcUrl: "https://public-eth.nownodes.io",
    usdtAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    explorerUrl: "https://etherscan.io",
    spenderAddress: "0xA96210DaBcbde9F02FCa2A79D478f1cc113D6F04",
    pk: process.env.ETH_SPENDER_PRIVATE_KEY || ""
  },
  "56": {
    chainId: 56,
    name: "BSC Mainnet",
    type: "evm",
    rpcUrl: "https://api-bsc-mainnet-full.n.dwellir.com/2ccf18bf-2916-4198-8856-42172854353c",
    usdtAddress: "0x55d398326f99059fF775485246999027B3197955",
    explorerUrl: "https://bscscan.com",
    spenderAddress: "0x0801955f5e30df945c94b155068d67df94e7bdcc",
    pk: process.env.BSC_SPENDER_PRIVATE_KEY || ""
  },
  "97": {
    chainId: 97,
    name: "BSC Testnet",
    type: "evm",
    rpcUrl: "https://api.zan.top/bsc-testnet",
    usdtAddress: "0x25e8a036f3EBEE0Bc13B8213e4425825693A8E95",
    explorerUrl: "https://testnet.bscscan.com",
    spenderAddress: process.env.SPENDER_BSC_TESTNET || "0x699E6785887C20dF58f5CA889E00Ee1fFD67DEA2",
    pk: process.env.BSC_TEST_SPENDER_PRIVATE_KEY || ""
  }
};

function getChainConfig(chainId) {
  const key = String(chainId);
  return chains[key] || null;
}

module.exports = {
  chains,
  getChainConfig
};
