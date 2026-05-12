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
