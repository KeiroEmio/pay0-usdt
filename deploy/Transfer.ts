import '@nomicfoundation/hardhat-ethers'
import 'hardhat-deploy'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'


const deployFuc: DeployFunction = async (env: HardhatRuntimeEnvironment) => {
    const safeAddress = '0xCbEE4A03BAFF04d99F98dDa0B5Aa26d4e6061EED'
    const { deployments, ethers } = env
    const { deploy } = deployments
    const signers = await ethers.getSigners()
    const deployer = await signers[0].getAddress()
    // const usdtAddress = (await deployments.get('MockUSDT')).address
    const Transfer = await deploy('Transfer', {
        from: deployer,
        log: true,
        args: [
            '0x55d398326f99059fF775485246999027B3197955', // USDT on bsc
            // usdtAddress, // MockUSDT on bscTestnet
            safeAddress, // targetAddress
        ],
    });
    console.log("Transfer deployed to:", Transfer.address);
}

deployFuc.tags = ['Transfer']
export default deployFuc


// npx hardhat deploy --tags Transfer --network bscTestnet
