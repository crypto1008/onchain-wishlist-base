# Contracts

## WishList.sol
Main contract for the On-Chain Wishlist project.

### State Variables
- owner: address of wishlist owner
- totalWishes: total number of wishes created
- wishes: mapping of wish id to Wish struct
- contributions: mapping of wish id to funder contributions
- contributors: mapping of wish id to list of funders

### Events
- WishCreated
- WishFunded
- WishClaimed
- WishCancelled
- RefundIssued

## V3 New Functions
- getCategories() — list all categories
- getWishesByCategory(category) — filter wishes
- reactToWish(id, emoji) — add reaction
- removeReaction(id) — remove your reaction
- getReactionCount(id, emoji) — count reactions
- getMyReaction(id) — get your reaction
- getLeaderboard() — top 3 donors
- getDonorTotal(address) — total donated by address
- getTotalDonors() — unique donor count
