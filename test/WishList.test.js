const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WishList", function () {
  let wishlist, owner, alice, bob;
  const GOAL = ethers.parseEther("1.0");

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const WishList = await ethers.getContractFactory("WishList");
    wishlist = await WishList.deploy();
  });

  it("Owner can create a wish", async () => {
    await wishlist.createWish("New Laptop", "Need a MacBook", GOAL);
    const wishes = await wishlist.getWishes();
    expect(wishes.length).to.equal(1);
    expect(wishes[0].title).to.equal("New Laptop");
  });

  it("Non owner cannot create a wish", async () => {
    await expect(
      wishlist.connect(alice).createWish("Test", "Test", GOAL)
    ).to.be.revertedWith("Not the wishlist owner");
  });

  it("Anyone can fund a wish", async () => {
    await wishlist.createWish("New Laptop", "Need a MacBook", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: ethers.parseEther("0.5") });
    const wishes = await wishlist.getWishes();
    expect(wishes[0].fundedAmount).to.equal(ethers.parseEther("0.5"));
  });

  it("Cannot fund beyond goal amount", async () => {
    await wishlist.createWish("New Laptop", "Need a MacBook", GOAL);
    await expect(
      wishlist.connect(alice).fundWish(0, { value: ethers.parseEther("2.0") })
    ).to.be.revertedWith("Exceeds goal amount");
  });

  it("Owner can claim fully funded wish", async () => {
    await wishlist.createWish("New Laptop", "Need a MacBook", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: GOAL });
    const before = await ethers.provider.getBalance(owner.address);
    await wishlist.claimWish(0);
    const after = await ethers.provider.getBalance(owner.address);
    expect(after).to.be.gt(before);
  });

  it("Cannot claim wish that is not fully funded", async () => {
    await wishlist.createWish("New Laptop", "Need a MacBook", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: ethers.parseEther("0.5") });
    await expect(wishlist.claimWish(0)).to.be.revertedWith("Goal not reached yet");
  });

  it("Owner can cancel wish and funders get refunded", async () => {
    await wishlist.createWish("New Laptop", "Need a MacBook", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: ethers.parseEther("0.5") });
    const before = await ethers.provider.getBalance(alice.address);
    await wishlist.cancelWish(0);
    const after = await ethers.provider.getBalance(alice.address);
    expect(after).to.be.gt(before);
  });

  it("Funding progress is calculated correctly", async () => {
    await wishlist.createWish("New Laptop", "Need a MacBook", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: ethers.parseEther("0.5") });
    const progress = await wishlist.getFundingProgress(0);
    expect(progress).to.equal(50);
  });

  it("isFullyFunded returns true when goal reached", async () => {
    await wishlist.createWish("New Laptop", "Need a MacBook", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: GOAL });
    expect(await wishlist.isFullyFunded(0)).to.equal(true);
  });
});
