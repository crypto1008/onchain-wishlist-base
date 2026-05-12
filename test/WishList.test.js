const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WishList V2", function () {
  let wishlist, owner, alice, bob, charlie;
  const GOAL = ethers.parseEther("1.0");
  const DAYS_30 = 30;

  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();
    const WishList = await ethers.getContractFactory("WishList");
    wishlist = await WishList.deploy();
  });

  // ── Basic Tests ──────────────────────────────────

  it("Owner can create a public wish with deadline", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, DAYS_30);
    const wish = await wishlist.getWish(0);
    expect(wish.title).to.equal("Laptop");
    expect(wish.isPrivate).to.equal(false);
  });

  it("Wish has correct deadline set", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, DAYS_30);
    const wish = await wishlist.getWish(0);
    const now = await time.latest();
    expect(wish.deadline).to.be.gt(now);
  });

  it("Non owner cannot create a wish", async () => {
    await expect(
      wishlist.connect(alice).createWish("Test", "Test", GOAL, DAYS_30)
    ).to.be.revertedWith("Not the wishlist owner");
  });

  // ── Deadline Tests ───────────────────────────────

  it("Cannot fund wish after deadline", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, 1);
    await time.increase(2 * 24 * 60 * 60);
    await expect(
      wishlist.connect(alice).fundWish(0, "test", { value: ethers.parseEther("0.1") })
    ).to.be.revertedWith("Wish deadline has passed");
  });

  it("Anyone can trigger refund after expired deadline", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, 1);
    await wishlist.connect(alice).fundWish(0, "hi", { value: ethers.parseEther("0.5") });
    await time.increase(2 * 24 * 60 * 60);
    const before = await ethers.provider.getBalance(alice.address);
    await wishlist.connect(bob).refundExpired(0);
    const after = await ethers.provider.getBalance(alice.address);
    expect(after).to.be.gt(before);
  });

  it("isExpired returns true after deadline", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, 1);
    await time.increase(2 * 24 * 60 * 60);
    expect(await wishlist.isExpired(0)).to.equal(true);
  });

  it("getRemainingTime returns 0 after deadline", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, 1);
    await time.increase(2 * 24 * 60 * 60);
    expect(await wishlist.getRemainingTime(0)).to.equal(0);
  });

  // ── Top Donor Tests ──────────────────────────────

  it("Top donor is tracked correctly", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, DAYS_30);
    await wishlist.connect(alice).fundWish(0, "go!", { value: ethers.parseEther("0.3") });
    await wishlist.connect(bob).fundWish(0, "nice", { value: ethers.parseEther("0.5") });
    const [topDonor] = await wishlist.getTopDonor(0);
    expect(topDonor).to.equal(bob.address);
  });

  it("Top donor updates when someone donates more", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, DAYS_30);
    await wishlist.connect(bob).fundWish(0, "first", { value: ethers.parseEther("0.3") });
    await wishlist.connect(alice).fundWish(0, "second", { value: ethers.parseEther("0.5") });
    const [topDonor] = await wishlist.getTopDonor(0);
    expect(topDonor).to.equal(alice.address);
  });

  // ── Funder Messages Tests ────────────────────────

  it("Funder can leave a message when funding", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, DAYS_30);
    await wishlist.connect(alice).fundWish(0, "Happy Birthday!", { value: ethers.parseEther("0.1") });
    const messages = await wishlist.getMessages(0);
    expect(messages.length).to.equal(1);
    expect(messages[0].text).to.equal("Happy Birthday!");
  });

  it("Multiple messages are stored correctly", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, DAYS_30);
    await wishlist.connect(alice).fundWish(0, "From Alice!", { value: ethers.parseEther("0.1") });
    await wishlist.connect(bob).fundWish(0, "From Bob!", { value: ethers.parseEther("0.1") });
    const messages = await wishlist.getMessages(0);
    expect(messages.length).to.equal(2);
  });

  it("Message stores sender address correctly", async () => {
    await wishlist.createWish("Laptop", "Need MacBook", GOAL, DAYS_30);
    await wishlist.connect(alice).fundWish(0, "Hi!", { value: ethers.parseEther("0.1") });
    const messages = await wishlist.getMessages(0);
    expect(messages[0].sender).to.equal(alice.address);
  });

  // ── Private Wish Tests ───────────────────────────

  it("Owner can create a private wish", async () => {
    await wishlist.createPrivateWish("Secret Gift", "Shh!", GOAL, DAYS_30, "mycode123");
    const wish = await wishlist.getWish(0);
    expect(wish.isPrivate).to.equal(true);
  });

  it("Cannot fund private wish without secret", async () => {
    await wishlist.createPrivateWish("Secret Gift", "Shh!", GOAL, DAYS_30, "mycode123");
    await expect(
      wishlist.connect(alice).fundPrivateWish(0, "wrongcode", "hi", { value: ethers.parseEther("0.1") })
    ).to.be.revertedWith("Wrong secret code");
  });

  it("Can fund private wish with correct secret", async () => {
    await wishlist.createPrivateWish("Secret Gift", "Shh!", GOAL, DAYS_30, "mycode123");
    await wishlist.connect(alice).fundPrivateWish(0, "mycode123", "shhh!", { value: ethers.parseEther("0.5") });
    const wish = await wishlist.getWish(0);
    expect(wish.fundedAmount).to.equal(ethers.parseEther("0.5"));
  });

  it("Cannot fund private wish using public function", async () => {
    await wishlist.createPrivateWish("Secret Gift", "Shh!", GOAL, DAYS_30, "mycode123");
    await expect(
      wishlist.connect(alice).fundWish(0, "hi", { value: ethers.parseEther("0.1") })
    ).to.be.revertedWith("This wish is private");
  });

  it("verifySecret returns true for correct secret", async () => {
    await wishlist.createPrivateWish("Secret Gift", "Shh!", GOAL, DAYS_30, "mycode123");
    expect(await wishlist.verifySecret(0, "mycode123")).to.equal(true);
  });

  it("verifySecret returns false for wrong secret", async () => {
    await wishlist.createPrivateWish("Secret Gift", "Shh!", GOAL, DAYS_30, "mycode123");
    expect(await wishlist.verifySecret(0, "wrongcode")).to.equal(false);
  });
});
