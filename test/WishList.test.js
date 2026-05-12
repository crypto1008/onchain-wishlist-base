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

  it("Cannot fund a cancelled wish", async () => {
    await wishlist.createWish("Test", "Test", GOAL);
    await wishlist.cancelWish(0);
    await expect(
      wishlist.connect(alice).fundWish(0, { value: ethers.parseEther("0.1") })
    ).to.be.revertedWith("Wish was cancelled");
  });

  it("Cannot claim cancelled wish", async () => {
    await wishlist.createWish("Test", "Test", GOAL);
    await wishlist.cancelWish(0);
    await expect(wishlist.claimWish(0)).to.be.revertedWith("Wish was cancelled");
  });

  it("Multiple funders can contribute to same wish", async () => {
    await wishlist.createWish("Test", "Test", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: ethers.parseEther("0.5") });
    await wishlist.connect(bob).fundWish(0, { value: ethers.parseEther("0.5") });
    expect(await wishlist.isFullyFunded(0)).to.equal(true);
  });

  it("Cannot create wish with empty title", async () => {
    await expect(
      wishlist.createWish("", "Description", GOAL)
    ).to.be.revertedWith("Title cannot be empty");
  });

  it("Cannot create wish with zero goal", async () => {
    await expect(
      wishlist.createWish("Test", "Test", 0)
    ).to.be.revertedWith("Goal must be greater than 0");
  });

  it("Can create multiple wishes", async () => {
    await wishlist.createWish("Wish 1", "Desc 1", GOAL);
    await wishlist.createWish("Wish 2", "Desc 2", GOAL);
    await wishlist.createWish("Wish 3", "Desc 3", GOAL);
    const wishes = await wishlist.getWishes();
    expect(wishes.length).to.equal(3);
  });

  it("Contributors list is tracked correctly", async () => {
    await wishlist.createWish("Test", "Test", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: ethers.parseEther("0.3") });
    await wishlist.connect(bob).fundWish(0, { value: ethers.parseEther("0.3") });
    const contribs = await wishlist.getContributors(0);
    expect(contribs.length).to.equal(2);
  });

  it("Cannot fund nonexistent wish", async () => {
    await expect(
      wishlist.connect(alice).fundWish(99, { value: ethers.parseEther("0.1") })
    ).to.be.revertedWith("Wish does not exist");
  });

  it("Cannot claim already claimed wish", async () => {
    await wishlist.createWish("Test", "Test", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: GOAL });
    await wishlist.claimWish(0);
    await expect(wishlist.claimWish(0)).to.be.revertedWith("Already claimed");
  });

  it("Funding progress is 100 when fully funded", async () => {
    await wishlist.createWish("Test", "Test", GOAL);
    await wishlist.connect(alice).fundWish(0, { value: GOAL });
    const progress = await wishlist.getFundingProgress(0);
    expect(progress).to.equal(100);
  });
});
