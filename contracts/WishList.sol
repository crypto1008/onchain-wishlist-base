// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title On-Chain Wishlist
/// @notice Create a public wishlist and let anyone fund your wishes with ETH
/// @dev Deployed on Base Mainnet

contract WishList {

    address public owner;
    uint256 public totalWishes;

    struct Wish {
        uint256 id;
        string title;
        string description;
        uint256 goalAmount;
        uint256 fundedAmount;
        bool claimed;
        bool cancelled;
    }

    mapping(uint256 => Wish) public wishes;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => address[]) public contributors;

    event WishCreated(uint256 indexed id, string title, uint256 goalAmount);
    event WishFunded(uint256 indexed id, address indexed funder, uint256 amount);
    event WishClaimed(uint256 indexed id, uint256 amount);
    event WishCancelled(uint256 indexed id);
    event RefundIssued(uint256 indexed id, address indexed funder, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the wishlist owner");
        _;
    }

    modifier wishExists(uint256 _id) {
        require(_id < totalWishes, "Wish does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Create a new wish with a funding goal
    function createWish(
        string calldata _title,
        string calldata _description,
        uint256 _goalAmount
    ) external onlyOwner {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_goalAmount > 0, "Goal must be greater than 0");

        wishes[totalWishes] = Wish({
            id: totalWishes,
            title: _title,
            description: _description,
            goalAmount: _goalAmount,
            fundedAmount: 0,
            claimed: false,
            cancelled: false
        });

        emit WishCreated(totalWishes, _title, _goalAmount);
        totalWishes++;
    }

    /// @notice Fund someone's wish with ETH
    function fundWish(uint256 _id) external payable wishExists(_id) {
        Wish storage wish = wishes[_id];
        require(!wish.claimed, "Wish already claimed");
        require(!wish.cancelled, "Wish was cancelled");
        require(msg.value > 0, "Must send ETH");
        require(
            wish.fundedAmount + msg.value <= wish.goalAmount,
            "Exceeds goal amount"
        );

        if (contributions[_id][msg.sender] == 0) {
            contributors[_id].push(msg.sender);
        }

        contributions[_id][msg.sender] += msg.value;
        wish.fundedAmount += msg.value;

        emit WishFunded(_id, msg.sender, msg.value);
    }

    /// @notice Owner claims ETH when wish is fully funded
    function claimWish(uint256 _id) external onlyOwner wishExists(_id) {
        Wish storage wish = wishes[_id];
        require(!wish.claimed, "Already claimed");
        require(!wish.cancelled, "Wish was cancelled");
        require(wish.fundedAmount >= wish.goalAmount, "Goal not reached yet");

        wish.claimed = true;
        uint256 amount = wish.fundedAmount;
        payable(owner).transfer(amount);

        emit WishClaimed(_id, amount);
    }

    /// @notice Owner cancels a wish and funders get refunded
    function cancelWish(uint256 _id) external onlyOwner wishExists(_id) {
        Wish storage wish = wishes[_id];
        require(!wish.claimed, "Already claimed");
        require(!wish.cancelled, "Already cancelled");

        wish.cancelled = true;

        for (uint256 i = 0; i < contributors[_id].length; i++) {
            address funder = contributors[_id][i];
            uint256 amount = contributions[_id][funder];
            if (amount > 0) {
                contributions[_id][funder] = 0;
                payable(funder).transfer(amount);
                emit RefundIssued(_id, funder, amount);
            }
        }

        emit WishCancelled(_id);
    }

    /// @notice Get all wishes
    function getWishes() external view returns (Wish[] memory) {
        Wish[] memory allWishes = new Wish[](totalWishes);
        for (uint256 i = 0; i < totalWishes; i++) {
            allWishes[i] = wishes[i];
        }
        return allWishes;
    }

    /// @notice Get contributors for a wish
    function getContributors(uint256 _id)
        external
        view
        wishExists(_id)
        returns (address[] memory)
    {
        return contributors[_id];
    }

    /// @notice Get funding progress percentage
    function getFundingProgress(uint256 _id)
        external
        view
        wishExists(_id)
        returns (uint256)
    {
        Wish storage wish = wishes[_id];
        if (wish.goalAmount == 0) return 0;
        return (wish.fundedAmount * 100) / wish.goalAmount;
    }

    /// @notice Check if a wish is fully funded
    function isFullyFunded(uint256 _id)
        external
        view
        wishExists(_id)
        returns (bool)
    {
        return wishes[_id].fundedAmount >= wishes[_id].goalAmount;
    }
}
