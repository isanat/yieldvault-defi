// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ReferralV3 is Ownable {
    struct User {
        address referrer;
        bytes8 code;
        uint256 totalRewards;
        uint256 referralCount;
    }

    mapping(address => User) public users;
    mapping(bytes8 => address) public codeToUser;

    uint256[] public levelRates;
    uint256 public constant MAX_BPS = 10000;
    uint256 public constant MAX_LEVELS = 5;

    event UserRegistered(address indexed user, address indexed referrer, bytes8 code);
    event RewardsDistributed(address indexed user, uint256 amount);

    constructor(address _owner) {
        _transferOwnership(_owner);
        levelRates = [uint256(4000), 2500, 1500, 1200, 800];
        
        // Register owner with a code
        bytes8 ownerCode = bytes8(uint64(uint160(_owner)));
        users[_owner].code = ownerCode;
        codeToUser[ownerCode] = _owner;
    }

    function register(bytes8 _code) external {
        require(codeToUser[_code] != address(0), "Invalid code");
        require(users[msg.sender].referrer == address(0), "Already registered");
        require(users[msg.sender].code == bytes8(0), "Already has code");

        address referrer = codeToUser[_code];
        users[msg.sender].referrer = referrer;
        bytes8 newCode = bytes8(uint64(uint160(msg.sender)));
        users[msg.sender].code = newCode;
        codeToUser[newCode] = msg.sender;

        // Update referral count
        address current = referrer;
        for (uint256 i = 0; i < MAX_LEVELS; i++) {
            if (current == address(0)) break;
            users[current].referralCount++;
            current = users[current].referrer;
        }

        emit UserRegistered(msg.sender, referrer, newCode);
    }

    function distributeRewards(address _user, uint256 _amount) external {
        address currentReferrer = users[_user].referrer;
        
        for (uint256 i = 0; i < MAX_LEVELS; i++) {
            if (currentReferrer == address(0)) break;

            uint256 reward = (_amount * levelRates[i]) / MAX_BPS;
            if (reward > 0) {
                users[currentReferrer].totalRewards += reward;
            }

            currentReferrer = users[currentReferrer].referrer;
        }

        emit RewardsDistributed(_user, _amount);
    }

    function getReferrer(address _user) external view returns (address) {
        return users[_user].referrer;
    }

    function getReferralCode(address _user) external view returns (bytes8) {
        return users[_user].code;
    }

    function isRegistered(address _user) external view returns (bool) {
        return users[_user].code != bytes8(0);
    }

    function setLevelRates(uint256[] calldata _rates) external onlyOwner {
        require(_rates.length == MAX_LEVELS, "Invalid length");
        uint256 total;
        for (uint256 i = 0; i < _rates.length; i++) {
            total += _rates[i];
        }
        require(total <= MAX_BPS, "Total > 100%");
        levelRates = _rates;
    }
}
