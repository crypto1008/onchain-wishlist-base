# On-Chain Wishlist on Base

A smart contract where you create a public wishlist and
anyone can fund your wishes with ETH on Base Mainnet.

## Contract Address
0x656B9bc877a7052968Cf8931f2b71150650cD35e

## View on Basescan
https://basescan.org/address/0x656B9bc877a7052968Cf8931f2b71150650cD35e

## Features
- Create wishes with ETH funding goals
- Anyone can fund your wishes with ETH
- Owner claims ETH when wish is fully funded
- Cancel wish and auto refund all contributors
- Track funding progress percentage

## Built With
- Solidity 0.8.20
- Hardhat
- OpenZeppelin
- Base Mainnet

## Setup
npm install
npx hardhat compile
npx hardhat test

## Deploy
npx hardhat run scripts/deploy.js --network base

## How It Works
1. Owner creates a wish with a title and ETH goal
2. Anyone can send ETH to fund the wish
3. When goal is reached owner claims the ETH
4. If cancelled all funders get refunded automatically
