const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WishList V3", function () {
  let wishlist, owner, alice, bob, charlie;
  const GOAL = ethers.parseEther("1.0");
  const DAYS_30 = 30;

  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();
    const WishList = await ethers.getContractFactory("WishList");
    wishlist = await WishList.deploy();
  });

  // ── Basic Tests ──────────────────────────────────

  it("Owner can create a public wish with category", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    const wish = await wishlist.getWish(0);
    expect(wish.title).to.equal("Laptop");
    expect(wish.category).to.equal("Tech");
  });

  it("Non owner cannot create a wish", async () => {
    await expect(
      wishlist.connect(alice).createWish("Test", "Test", "Tech", GOAL, DAYS_30)
    ).to.be.revertedWith("Not the wishlist owner");
  });

  it("Cannot create wish with empty category", async () => {
    await expect(
      wishlist.createWish("Test", "Test", "", GOAL, DAYS_30)
    ).to.be.revertedWith("Category cannot be empty");
  });

  // ── Category Tests ───────────────────────────────

  it("Can filter wishes by category", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.createWish("Trip", "Go to Paris", "Travel", GOAL, DAYS_30);
    await wishlist.createWish("Phone", "Need iPhone", "Tech", GOAL, DAYS_30);
    const techWishes = await wishlist.getWishesByCategory("Tech");
    expect(techWishes.length).to.equal(2);
  });

  it("Category filter returns empty for unknown category", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    const result = await wishlist.getWishesByCategory("Food");
    expect(result.length).to.equal(0);
  });

  it("getCategories returns all default categories", async () => {
    const cats = await wishlist.getCategories();
    expect(cats.length).to.equal(6);
  });

  // ── Reaction Tests ───────────────────────────────

  it("User can react to a wish", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(alice).reactToWish(0, "fire");
    const count = await wishlist.getReactionCount(0, "fire");
    expect(count).to.equal(1);
  });

  it("User can change their reaction", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(alice).reactToWish(0, "fire");
    await wishlist.connect(alice).reactToWish(0, "heart");
    const fireCount = await wishlist.getReactionCount(0, "fire");
    const heartCount = await wishlist.getReactionCount(0, "heart");
    expect(fireCount).to.equal(0);
    expect(heartCount).to.equal(1);
  });

  it("Multiple users can react to same wish", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(alice).reactToWish(0, "fire");
    await wishlist.connect(bob).reactToWish(0, "fire");
    await wishlist.connect(charlie).reactToWish(0, "heart");
    const fireCount = await wishlist.getReactionCount(0, "fire");
    expect(fireCount).to.equal(2);
  });

  it("User can remove their reaction", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(alice).reactToWish(0, "fire");
    await wishlist.connect(alice).removeReaction(0);
    const count = await wishlist.getReactionCount(0, "fire");
    expect(count).to.equal(0);
  });

  it("Cannot remove reaction if none exists", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await expect(
      wishlist.connect(alice).removeReaction(0)
    ).to.be.revertedWith("No reaction to remove");
  });

  it("getMyReaction returns correct reaction", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(alice).reactToWish(0, "star");
    const reaction = await wishlist.connect(alice).getMyReaction(0);
    expect(reaction).to.equal("star");
  });

  // ── Leaderboard Tests ────────────────────────────

  it("Leaderboard tracks top donor correctly", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(alice).fundWish(0, "go!", { value: ethers.parseEther("0.3") });
    await wishlist.connect(bob).fundWish(0, "nice", { value: ethers.parseEther("0.5") });
    const [first] = await wishlist.getLeaderboard();
    expect(first).to.equal(bob.address);
  });

  it("Leaderboard updates when donor gives more", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(bob).fundWish(0, "first", { value: ethers.parseEther("0.3") });
    await wishlist.connect(alice).fundWish(0, "second", { value: ethers.parseEther("0.5") });
    const [first] = await wishlist.getLeaderboard();
    expect(first).to.equal(alice.address);
  });

  it("getDonorTotal returns correct amount", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(alice).fundWish(0, "hi", { value: ethers.parseEther("0.3") });
    const total = await wishlist.getDonorTotal(alice.address);
    expect(total).to.equal(ethers.parseEther("0.3"));
  });

  it("getTotalDonors returns correct count", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    await wishlist.connect(alice).fundWish(0, "hi", { value: ethers.parseEther("0.3") });
    await wishlist.connect(bob).fundWish(0, "yo", { value: ethers.parseEther("0.2") });
    const total = await wishlist.getTotalDonors();
    expect(total).to.equal(2);
  });

  it("Donor total accumulates across multiple wishes", async () => {
    await wishlist.createWish("Wish 1", "Desc", "Tech", GOAL, DAYS_30);
    await wishlist.createWish("Wish 2", "Desc", "Gift", GOAL, DAYS_30);
    await wishlist.connect(alice).fundWish(0, "hi", { value: ethers.parseEther("0.2") });
    await wishlist.connect(alice).fundWish(1, "hi", { value: ethers.parseEther("0.3") });
    const total = await wishlist.getDonorTotal(alice.address);
    expect(total).to.equal(ethers.parseEther("0.5"));
  });

 it("Travel category wish is created correctly", async () => {
    await wishlist.createWish("Paris Trip", "Visit Eiffel Tower", "Travel", GOAL, DAYS_30);
    const wish = await wishlist.getWish(0);
    expect(wish.category).to.equal("Travel");
  });

 it("Reaction count starts at zero for new wish", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", "Tech", GOAL, DAYS_30);
    const count = await wishlist.getReactionCount(0, "fire");
    expect(count).to.equal(0);
  });

 it("getTotalDonors returns zero initially", async () => {
    const total = await wishlist.getTotalDonors();
    expect(total).to.equal(0);
  });
});
