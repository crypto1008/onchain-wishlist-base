# On-Chain Wishlist on Base

A smart contract where you create a public wishlist and
anyone can fund your wishes with ETH on Base Mainnet.

## V2 Features
- ⏰ Wish Deadlines — auto refund after expiry
- 🏆 Top Donor Badge — biggest contributor tracked onchain
- 💬 Funder Messages — leave a note when you fund
- 🔒 Private Wishes — secret code required to fund

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
- 🎁 Wish Categories — Filter by Gift, Tech, Travel, Education, Health
- ⭐ Wish Reactions — React with ❤️ 🔥 ⭐ 🎉 💪
- 📊 Donor Leaderboard — Top 3 donors ranked across all wishes

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

## Use Cases
- Save for a new laptop or phone
- Community fund a public good
- Friends fund a birthday gift
- Team fund a shared tool or software

## Contract Functions
- createWish(title, description, goalAmount)
- fundWish(wishId)
- claimWish(wishId)
- cancelWish(wishId)
- getWishes()
- getFundingProgress(wishId)
- isFullyFunded(wishId)
- getContributors(wishId)

## Security
- Only owner can create, claim or cancel wishes
- Contributions cannot exceed goal amount
- Refunds are automatic on cancellation
- No external contract calls
- Tested with full test suite

## FAQ

**Is this safe to use?**
Yes, the contract is fully tested and deployed on Base Mainnet.

**Can I cancel my wish anytime?**
Yes, only the owner can cancel and all funders get refunded.

**What happens if goal is not reached?**
You can cancel the wish and everyone gets their ETH back.

**What are the gas fees?**
Base Mainnet has very low gas fees, usually under $0.10.

## License
MIT

## Acknowledgements
- Built on Base Mainnet
- Powered by Hardhat and OpenZeppelin
- Inspired by the Base Builder community
