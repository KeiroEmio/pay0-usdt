import '@nomicfoundation/hardhat-ethers'
import 'hardhat-deploy'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'


const deployFuc: DeployFunction = async (env: HardhatRuntimeEnvironment) => {
    const { deployments, ethers } = env
    const { deploy } = deployments
    const signers = await ethers.getSigners()
    const deployer = await signers[0].getAddress()
    const usdtMetaTransferProxy = await deploy('UsdtMetaTransferProxy', {
        from: deployer,
        log: true,
    });
    console.log("UsdtMetaTransferProxy deployed to:", usdtMetaTransferProxy.address);
}


deployFuc.tags = ['UsdtMetaTransferProxy']
export default deployFuc


// npx hardhat deploy --tags UsdtMetaTransferProxy --network bsc
