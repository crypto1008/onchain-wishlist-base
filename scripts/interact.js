const { ethers } = require("hardhat");

const CONTRACT_ADDRESS = "0x656B9bc877a7052968Cf8931f2b71150650cD35e";

const ABI = [
  "function createWish(string,string,uint256) external",
  "function getWishes() external view returns (tuple(uint256,string,string,uint256,uint256,bool,bool)[])",
  "function totalWishes() external view returns (uint256)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const total = await contract.totalWishes();
  console.log("Total wishes:", total.toString());
  const wishes = await contract.getWishes();
  console.log("All wishes:", wishes);
}

main().catch(console.error);
