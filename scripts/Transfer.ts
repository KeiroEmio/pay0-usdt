import { deployments, ethers } from "hardhat";

async function main() {
    const [user1, user2] = await ethers.getSigners();
    const transferAddress = (await deployments.getOrNull("Transfer"))?.address;
    const mockUSDTAddress = (await deployments.getOrNull("MockUSDT"))?.address;

    if (!transferAddress || !mockUSDTAddress) {
        throw new Error("Transfer contract or MockUSDT contract not deployed");
    }

    const mockUSDT = await ethers.getContractAt("MockUSDT", mockUSDTAddress) as any;
    const transfer = await ethers.getContractAt("Transfer", transferAddress) as any;
    console.log("owner:", await transfer.owner())
    const decimals = await mockUSDT.decimals();
    console.log("decimals:", decimals);
    // mockUSDT transfer to user2
    let tx = await mockUSDT.connect(user1).transfer(user2.address, ethers.parseUnits("100000", decimals));
    await tx.wait();

    const amount = ethers.parseUnits("1000", decimals);
    tx = await mockUSDT.connect(user2).approve(transferAddress, amount);
    await tx.wait();

    tx = await transfer.connect(user2).transferUSD(amount);
    await tx.wait();

    // const ownerAddr = await mockUSDT.owner();
    // const ownerSigner = await ethers.getSigner(ownerAddr);
    // await mockUSDT.connect(ownerSigner).mint(await user1.getAddress(), amount);
    // await mockUSDT.connect(user1).approve(transferAddress, amount);
    // await transfer.connect(user1).transferUSD(amount);
    const safeAddr = await transfer.safeAddress();
    const safeBal = await mockUSDT.balanceOf(safeAddr);
    console.log("safeAddress USDT balance:", ethers.formatUnits(safeBal, decimals));
}


if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

// npx hardhat run scripts/Transfer.ts --network bscTestnet
