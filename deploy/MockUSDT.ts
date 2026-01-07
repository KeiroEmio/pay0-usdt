import '@nomicfoundation/hardhat-ethers'
import 'hardhat-deploy'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'


const deployFuc: DeployFunction = async (env: HardhatRuntimeEnvironment) => {
    const { deployments, ethers } = env
    const { deploy } = deployments
    const signers = await ethers.getSigners()
    const deployer = await signers[0].getAddress()
    const MockUSDT = await deploy('MockUSDT', {
        from: deployer,
        log: true,
        // args: [
        //     '0x55d398326f99059fF775485246999027B3197955', // USDT on bscTestnet
        // ],
    });
    console.log("MockUSDT deployed to:", MockUSDT.address);
}

deployFuc.tags = ['MockUSDT']
export default deployFuc


// npx hardhat deploy --tags MockUSDT --network bscTestnet
