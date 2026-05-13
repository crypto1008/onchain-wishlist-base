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
- getCategories()
- getWishesByCategory(category)
- reactToWish(id, emoji)
- removeReaction(id)
- getReactionCount(id, emoji)
- getMyReaction(id)
- getAllReactions(id)
- getLeaderboard()
- getDonorTotal(address)
- getTotalDonors()
