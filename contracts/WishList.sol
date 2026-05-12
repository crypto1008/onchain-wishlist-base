// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title On-Chain Wishlist V3
/// @notice Wishes with categories, reactions and donor leaderboard
/// @dev Deployed on Base Mainnet

contract WishList {

    address public owner;
    uint256 public totalWishes;

    // ── Structs ──────────────────────────────────────
    struct Wish {
        uint256 id;
        string title;
        string description;
        string category;
        uint256 goalAmount;
        uint256 fundedAmount;
        uint256 deadline;
        bool claimed;
        bool cancelled;
        bool isPrivate;
        bytes32 secretHash;
        address topDonor;
        uint256 topDonorAmount;
    }

    struct Message {
        address sender;
        string text;
        uint256 amount;
        uint256 timestamp;
    }

    struct LeaderboardEntry {
        address donor;
        uint256 totalAmount;
    }

    // ── Storage ──────────────────────────────────────
    mapping(uint256 => Wish) public wishes;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => address[]) public contributors;
    mapping(uint256 => Message[]) public wishMessages;

    // Reactions
    mapping(uint256 => mapping(string => uint256)) public reactionCounts;
    mapping(uint256 => mapping(address => string)) public userReactions;

    // Leaderboard
    mapping(address => uint256) public totalDonated;
    address[] public allDonors;
    mapping(address => bool) public isDonor;

    // Categories
    string[] public categories;

    // ── Events ───────────────────────────────────────
    event WishCreated(uint256 indexed id, string title, uint256 goalAmount, uint256 deadline, string category);
    event WishFunded(uint256 indexed id, address indexed funder, uint256 amount, string message);
    event WishClaimed(uint256 indexed id, uint256 amount);
    event WishCancelled(uint256 indexed id);
    event RefundIssued(uint256 indexed id, address indexed funder, uint256 amount);
    event DeadlineExpired(uint256 indexed id);
    event NewTopDonor(uint256 indexed id, address indexed donor, uint256 amount);
    event WishReacted(uint256 indexed id, address indexed user, string emoji);

    // ── Modifiers ────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the wishlist owner");
        _;
    }

    modifier wishExists(uint256 _id) {
        require(_id < totalWishes, "Wish does not exist");
        _;
    }

    // ── Constructor ──────────────────────────────────
    constructor() {
        owner = msg.sender;
        categories.push("Gift");
        categories.push("Tech");
        categories.push("Travel");
        categories.push("Education");
        categories.push("Health");
        categories.push("Other");
    }

    // ─────────────────────────────────────────────────
    // FEATURE 1 — CATEGORIES
    // ─────────────────────────────────────────────────

    /// @notice Create a public wish with category and deadline
    function createWish(
        string calldata _title,
        string calldata _description,
        string calldata _category,
        uint256 _goalAmount,
        uint256 _deadlineDays
    ) external onlyOwner {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_goalAmount > 0, "Goal must be greater than 0");
        require(_deadlineDays > 0, "Deadline must be at least 1 day");
        require(bytes(_category).length > 0, "Category cannot be empty");

        uint256 deadline = block.timestamp + (_deadlineDays * 1 days);

        wishes[totalWishes] = Wish({
            id: totalWishes,
            title: _title,
            description: _description,
            category: _category,
            goalAmount: _goalAmount,
            fundedAmount: 0,
            deadline: deadline,
            claimed: false,
            cancelled: false,
            isPrivate: false,
            secretHash: bytes32(0),
            topDonor: address(0),
            topDonorAmount: 0
        });

        emit WishCreated(totalWishes, _title, _goalAmount, deadline, _category);
        totalWishes++;
    }

    /// @notice Create a private wish with category, deadline and secret
    function createPrivateWish(
        string calldata _title,
        string calldata _description,
        string calldata _category,
        uint256 _goalAmount,
        uint256 _deadlineDays,
        string calldata _secret
    ) external onlyOwner {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_goalAmount > 0, "Goal must be greater than 0");
        require(_deadlineDays > 0, "Deadline must be at least 1 day");
        require(bytes(_category).length > 0, "Category cannot be empty");
        require(bytes(_secret).length > 0, "Secret cannot be empty");

        uint256 deadline = block.timestamp + (_deadlineDays * 1 days);
        bytes32 secretHash = keccak256(abi.encodePacked(_secret));

        wishes[totalWishes] = Wish({
            id: totalWishes,
            title: _title,
            description: _description,
            category: _category,
            goalAmount: _goalAmount,
            fundedAmount: 0,
            deadline: deadline,
            claimed: false,
            cancelled: false,
            isPrivate: true,
            secretHash: secretHash,
            topDonor: address(0),
            topDonorAmount: 0
        });

        emit WishCreated(totalWishes, _title, _goalAmount, deadline, _category);
        totalWishes++;
    }

    /// @notice Get all available categories
    function getCategories() external view returns (string[] memory) {
        return categories;
    }

    /// @notice Get wishes filtered by category
    function getWishesByCategory(
        string calldata _category
    ) external view returns (Wish[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < totalWishes; i++) {
            if (keccak256(bytes(wishes[i].category)) == keccak256(bytes(_category))) {
                count++;
            }
        }
        Wish[] memory filtered = new Wish[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < totalWishes; i++) {
            if (keccak256(bytes(wishes[i].category)) == keccak256(bytes(_category))) {
                filtered[idx] = wishes[i];
                idx++;
            }
        }
        return filtered;
    }

    // ─────────────────────────────────────────────────
    // FUND WISH
    // ─────────────────────────────────────────────────

    /// @notice Fund a public wish with an optional message
    function fundWish(
        uint256 _id,
        string calldata _message
    ) external payable wishExists(_id) {
        Wish storage wish = wishes[_id];
        require(!wish.isPrivate, "This wish is private");
        require(!wish.claimed, "Wish already claimed");
        require(!wish.cancelled, "Wish was cancelled");
        require(msg.value > 0, "Must send ETH");
        require(block.timestamp <= wish.deadline, "Wish deadline has passed");
        require(
            wish.fundedAmount + msg.value <= wish.goalAmount,
            "Exceeds goal amount"
        );
        _processFund(_id, _message);
    }

    /// @notice Fund a private wish with secret code
    function fundPrivateWish(
        uint256 _id,
        string calldata _secret,
        string calldata _message
    ) external payable wishExists(_id) {
        Wish storage wish = wishes[_id];
        require(wish.isPrivate, "This wish is not private");
        require(!wish.claimed, "Wish already claimed");
        require(!wish.cancelled, "Wish was cancelled");
        require(msg.value > 0, "Must send ETH");
        require(block.timestamp <= wish.deadline, "Wish deadline has passed");
        require(
            keccak256(abi.encodePacked(_secret)) == wish.secretHash,
            "Wrong secret code"
        );
        require(
            wish.fundedAmount + msg.value <= wish.goalAmount,
            "Exceeds goal amount"
        );
        _processFund(_id, _message);
    }

    /// @notice Internal funding logic
    function _processFund(uint256 _id, string calldata _message) internal {
        Wish storage wish = wishes[_id];

        if (contributions[_id][msg.sender] == 0) {
            contributors[_id].push(msg.sender);
        }

        contributions[_id][msg.sender] += msg.value;
        wish.fundedAmount += msg.value;

        // Update leaderboard
        if (!isDonor[msg.sender]) {
            isDonor[msg.sender] = true;
            allDonors.push(msg.sender);
        }
        totalDonated[msg.sender] += msg.value;

        // Update top donor
        if (contributions[_id][msg.sender] > wish.topDonorAmount) {
            wish.topDonor = msg.sender;
            wish.topDonorAmount = contributions[_id][msg.sender];
            emit NewTopDonor(_id, msg.sender, wish.topDonorAmount);
        }

        // Store message
        if (bytes(_message).length > 0) {
            wishMessages[_id].push(Message({
                sender: msg.sender,
                text: _message,
                amount: msg.value,
                timestamp: block.timestamp
            }));
        }

        emit WishFunded(_id, msg.sender, msg.value, _message);
    }

    // ─────────────────────────────────────────────────
    // CLAIM & CANCEL
    // ─────────────────────────────────────────────────

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

    /// @notice Owner cancels wish and refunds all funders
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

    /// @notice Anyone can trigger refund after deadline if goal not reached
    function refundExpired(uint256 _id) external wishExists(_id) {
        Wish storage wish = wishes[_id];
        require(!wish.claimed, "Already claimed");
        require(!wish.cancelled, "Already cancelled");
        require(block.timestamp > wish.deadline, "Deadline not passed yet");
        require(wish.fundedAmount < wish.goalAmount, "Goal was reached");
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
        emit DeadlineExpired(_id);
    }

    // ─────────────────────────────────────────────────
    // FEATURE 2 — REACTIONS
    // ─────────────────────────────────────────────────

    /// @notice React to a wish with an emoji
    function reactToWish(
        uint256 _id,
        string calldata _emoji
    ) external wishExists(_id) {
        require(!wishes[_id].cancelled, "Wish was cancelled");

        // Remove old reaction if exists
        string memory oldReaction = userReactions[_id][msg.sender];
        if (bytes(oldReaction).length > 0) {
            reactionCounts[_id][oldReaction]--;
        }

        // Set new reaction
        userReactions[_id][msg.sender] = _emoji;
        reactionCounts[_id][_emoji]++;

        emit WishReacted(_id, msg.sender, _emoji);
    }

    /// @notice Remove your reaction from a wish
    function removeReaction(uint256 _id) external wishExists(_id) {
        string memory existing = userReactions[_id][msg.sender];
        require(bytes(existing).length > 0, "No reaction to remove");
        reactionCounts[_id][existing]--;
        delete userReactions[_id][msg.sender];
    }

    /// @notice Get reaction count for a specific emoji
    function getReactionCount(
        uint256 _id,
        string calldata _emoji
    ) external view wishExists(_id) returns (uint256) {
        return reactionCounts[_id][_emoji];
    }

    /// @notice Get all reaction counts for a wish
    function getAllReactions(
        uint256 _id
    ) external view wishExists(_id) returns (
        uint256 hearts,
        uint256 fires,
        uint256 stars,
        uint256 celebrations,
        uint256 muscles
    ) {
        hearts = reactionCounts[_id][unicode"\u2764\ufe0f"];
        fires = reactionCounts[_id][unicode"\ud83d\udd25"];
        stars = reactionCounts[_id][unicode"\u2b50"];
        celebrations = reactionCounts[_id][unicode"\ud83c\udf89"];
        muscles = reactionCounts[_id][unicode"\ud83d\udcaa"];
    }

    /// @notice Get your reaction on a wish
    function getMyReaction(
        uint256 _id
    ) external view wishExists(_id) returns (string memory) {
        return userReactions[_id][msg.sender];
    }

    // ─────────────────────────────────────────────────
    // FEATURE 3 — DONOR LEADERBOARD
    // ─────────────────────────────────────────────────

    /// @notice Get top 3 donors across all wishes
    function getLeaderboard() external view returns (
        address first, uint256 firstAmount,
        address second, uint256 secondAmount,
        address third, uint256 thirdAmount
    ) {
        uint256 len = allDonors.length;
        address[3] memory tops;
        uint256[3] memory amounts;

        for (uint256 i = 0; i < len; i++) {
            address donor = allDonors[i];
            uint256 amount = totalDonated[donor];

            if (amount > amounts[0]) {
                amounts[2] = amounts[1]; tops[2] = tops[1];
                amounts[1] = amounts[0]; tops[1] = tops[0];
                amounts[0] = amount;     tops[0] = donor;
            } else if (amount > amounts[1]) {
                amounts[2] = amounts[1]; tops[2] = tops[1];
                amounts[1] = amount;     tops[1] = donor;
            } else if (amount > amounts[2]) {
                amounts[2] = amount;     tops[2] = donor;
            }
        }

        return (
            tops[0], amounts[0],
            tops[1], amounts[1],
            tops[2], amounts[2]
        );
    }

    /// @notice Get total amount donated by a specific address
    function getDonorTotal(address _donor) external view returns (uint256) {
        return totalDonated[_donor];
    }

    /// @notice Get total number of unique donors
    function getTotalDonors() external view returns (uint256) {
        return allDonors.length;
    }

    // ─────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────

    function getWishes() external view returns (Wish[] memory) {
        Wish[] memory allWishes = new Wish[](totalWishes);
        for (uint256 i = 0; i < totalWishes; i++) {
            allWishes[i] = wishes[i];
        }
        return allWishes;
    }

    function getWish(uint256 _id) external view wishExists(_id) returns (Wish memory) {
        return wishes[_id];
    }

    function getMessages(uint256 _id) external view wishExists(_id) returns (Message[] memory) {
        return wishMessages[_id];
    }

    function getContributors(uint256 _id) external view wishExists(_id) returns (address[] memory) {
        return contributors[_id];
    }

    function getFundingProgress(uint256 _id) external view wishExists(_id) returns (uint256) {
        Wish storage wish = wishes[_id];
        if (wish.goalAmount == 0) return 0;
        return (wish.fundedAmount * 100) / wish.goalAmount;
    }

    function isFullyFunded(uint256 _id) external view wishExists(_id) returns (bool) {
        return wishes[_id].fundedAmount >= wishes[_id].goalAmount;
    }

    function isExpired(uint256 _id) external view wishExists(_id) returns (bool) {
        return block.timestamp > wishes[_id].deadline;
    }

    function getRemainingTime(uint256 _id) external view wishExists(_id) returns (uint256) {
        if (block.timestamp > wishes[_id].deadline) return 0;
        return wishes[_id].deadline - block.timestamp;
    }

    function getRemainingAmount(uint256 _id) external view wishExists(_id) returns (uint256) {
        Wish storage wish = wishes[_id];
        if (wish.fundedAmount >= wish.goalAmount) return 0;
        return wish.goalAmount - wish.fundedAmount;
    }

    function getTopDonor(uint256 _id) external view wishExists(_id) returns (address, uint256) {
        Wish storage wish = wishes[_id];
        return (wish.topDonor, wish.topDonorAmount);
    }

    function verifySecret(uint256 _id, string calldata _secret) external view wishExists(_id) returns (bool) {
        return keccak256(abi.encodePacked(_secret)) == wishes[_id].secretHash;
    }
}
