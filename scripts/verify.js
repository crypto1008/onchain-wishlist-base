const { run } = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x656B9bc877a7052968Cf8931f2b71150650cD35e";
  console.log("Verifying contract on Basescan...");
  await run("verify:verify", {
    address: CONTRACT_ADDRESS,
    constructorArguments: []
  });
  console.log("Contract verified!");
}

main().catch(console.error);
