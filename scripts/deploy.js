const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  console.log("Deploying WishList contract...");

  const WishList = await ethers.getContractFactory("WishList");
  const wishlist = await WishList.deploy();
  await wishlist.waitForDeployment();

  const address = await wishlist.getAddress();

  console.log("------------------------------------------");
  console.log("WishList deployed to:", address);
  console.log("View on Basescan:");
  console.log("https://basescan.org/address/" + address);
  console.log("------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
