// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Config.sol";

/**
 * @title FeeDistributor
 * @dev Distributes fees to treasury and handles protocol revenue
 */
contract FeeDistributor is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant REFERRAL_ROLE = keccak256("REFERRAL_ROLE");

    Config public config;
    IERC20 public usdt;

    uint256 public totalFeesCollected;
    uint256 public totalTreasuryFees;
    uint256 public totalReferralFees;
    
    mapping(address => uint256) public pendingUserFees;

    event FeesDistributed(uint256 amount, uint8 feeType);
    event FeesClaimed(address indexed user, uint256 amount);
    event TreasuryWithdrawn(uint256 amount);

    constructor(address _config, address _usdt, address _admin) {
        config = Config(_config);
        usdt = IERC20(_usdt);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VAULT_ROLE, _admin);
        _grantRole(REFERRAL_ROLE, _admin);
    }

    function grantVaultRole(address vault) external onlyRole(ADMIN_ROLE) {
        _grantRole(VAULT_ROLE, vault);
    }

    function grantReferralRole(address referral) external onlyRole(ADMIN_ROLE) {
        _grantRole(REFERRAL_ROLE, referral);
    }

    function distributeFees(uint256 amount, uint8 feeType) external {
        require(
            hasRole(VAULT_ROLE, msg.sender) || hasRole(REFERRAL_ROLE, msg.sender),
            "Unauthorized"
        );

        totalFeesCollected += amount;
        
        if (feeType == 0) {
            totalTreasuryFees += amount;
        } else if (feeType == 1) {
            totalReferralFees += amount;
        }

        emit FeesDistributed(amount, feeType);
    }

    function claimFees() external returns (uint256) {
        uint256 amount = pendingUserFees[msg.sender];
        require(amount > 0, "No fees to claim");

        pendingUserFees[msg.sender] = 0;
        usdt.transfer(msg.sender, amount);

        emit FeesClaimed(msg.sender, amount);
        return amount;
    }

    function withdrawToTreasury() external onlyRole(ADMIN_ROLE) returns (uint256) {
        address treasury = config.treasury();
        require(treasury != address(0), "Treasury not set");

        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            usdt.transfer(treasury, balance);
            emit TreasuryWithdrawn(balance);
            return balance;
        }
        return 0;
    }

    function getPendingFees(address user) external view returns (uint256) {
        return pendingUserFees[user];
    }
}
