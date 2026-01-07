import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'
import "hardhat-deploy";
import '@nomicfoundation/hardhat-verify'
dotenvConfig({ path: resolve(__dirname, './.env') })


const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [process.env.PRIVATE_KEY_USER1 || ""],
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY_USER1 || "", process.env.PRIVATE_KEY_USER2 || ""],
    },

    tron: {
      url: "https://api.trongrid.io",
      chainId: 195,
      accounts: [process.env.PRIVATE_KEY_TRX || ""],
    },
  },
  etherscan: {
    apiKey: process.env.API_KEY || "",
    customChains: [
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/v2/api?chainid=56",
          browserURL: "https://bsc-dataseed.binance.org/"
        }
      }
    ]
  },
};

export default config;
