import { TronWeb } from 'tronweb';
import { config as dotenvConfig } from 'dotenv'
import { abi, bytecode } from '../artifacts/contracts/Transfer.sol/Transfer.json';
import * as fs from 'fs';
import * as path from 'path';
import { resolve } from 'path'
dotenvConfig({ path: resolve(__dirname, '../.env') })

const privateKey = process.env.PRIVATE_KEY_TRX;
if (!privateKey) {
    throw new Error("TRON_PRIVATE_KEY is not set in .env file. Please add it.");
}

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io', // 使用 TronGrid 主网
    privateKey: privateKey
});

async function main() {
    console.log("Deploying Transfer contract to Tron...");

    // 2. 部署参数
    const usdtAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // Tron 主网 USDT
    const safeAddress = 'TYcA18VeWK3SE7KVss6BtEUyfSVQrkneVE'; // 你的收款地址
    const parameters = [usdtAddress, safeAddress];

    // 3. 手动构建、签名和广播交易，以获取交易哈希并增加稳定性
    console.log("Building deployment transaction...");
    const transaction = await tronWeb.transactionBuilder.createSmartContract({
        abi: abi,
        bytecode: bytecode,
        feeLimit: 1_500_000_000,
        callValue: 0,
        parameters: parameters,
        name: "Transfer"
    });

    console.log("Signing transaction...");
    const signedTx = await tronWeb.trx.sign(transaction, privateKey);
    console.log("Broadcasting transaction...");
    const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

    if (!receipt || !receipt.result) {
        console.error("Transaction failed to broadcast:", receipt);
        throw new Error("Transaction broadcast failed");
    }

    console.log(`Transaction broadcasted! TXID: ${receipt.txid}`);
    console.log("Waiting for transaction to be confirmed and contract to be deployed...");

    // 4. 轮询等待合约地址生成
    let contractAddress = null;
    let retries = 15;
    while (retries > 0) {
        const txInfo = await tronWeb.trx.getTransactionInfo(receipt.txid);
        if (txInfo && txInfo.contract_address) {
            contractAddress = tronWeb.address.fromHex(txInfo.contract_address);
            console.log("Contract deployed successfully!");
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒
        retries--;
        console.log(`Waiting for confirmation... (${15 - retries}/15)`);
    }

    if (!contractAddress) {
        throw new Error(`Could not get contract address for TX ${receipt.txid} after multiple retries.`);
    }

    console.log("✅ Transfer contract deployed to:", contractAddress);

    // 5. 保存部署产物 (artifact) 到 deployments 文件夹
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    const networkDir = path.join(deploymentsDir, 'tron'); // 创建 tron 子目录
    if (!fs.existsSync(networkDir)) {
        fs.mkdirSync(networkDir, { recursive: true });
    }

    const artifact = {
        address: contractAddress,
        abi: abi,
        transactionHash: receipt.txid,
        args: parameters,
        bytecode: bytecode
    };

    const artifactPath = path.join(networkDir, 'Transfer.json');
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

    console.log(`✅ Deployment artifact saved to ${artifactPath}`);
}

main().catch(err => {
    // 提供更具体的错误指引
    const errorMessage = (err instanceof Error) ? err.message : JSON.stringify(err);
    if (errorMessage.includes("balance is not sufficient")) {
        console.error("❌ Deployment failed: Insufficient TRX balance for fees (Energy/Bandwidth). Please top up the deployer account.");
    } else if (errorMessage.includes("Contract validate error")) {
        console.error("❌ Deployment failed: Contract validation error. This often means the contract bytecode is invalid or parameters are wrong.");
    } else {
        console.error("❌ Deployment failed:", err);
    }
    process.exit(1);
});