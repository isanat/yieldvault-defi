// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IFeeDistributor.sol";
import "./core/Config.sol";

/**
 * @title FeeDistributor
 * @dev Handles distribution of fees to treasury and manages commission transfers
 * for the referral system. Receives fees from Vault and routes them appropriately.
 */
contract FeeDistributor is IFeeDistributor, AccessControl, ReentrancyGuard {
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REFERRAL_ROLE = keccak256("REFERRAL_ROLE");

    Config public config;
    IERC20 public usdt;

    // Pending treasury fees
    uint256 private _pendingTreasuryFees;
    
    // Total fees distributed
    uint256 public totalDepositFeesReceived;
    uint256 public totalPerformanceFeesReceived;
    uint256 public totalReferralCommissionsPaid;
    
    // Fee type constants
    uint8 public constant FEE_TYPE_DEPOSIT = 0;
    uint8 public constant FEE_TYPE_PERFORMANCE = 1;

    // Events are inherited from IFeeDistributor

    constructor(address _config, address _usdt, address _admin) {
        config = Config(_config);
        usdt = IERC20(_usdt);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    /**
     * @dev Receive USDT from vault (fees)
     * Must be approved first
     */
    function receiveFees(uint256 amount) external onlyRole(VAULT_ROLE) {
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }

    /**
     * @dev Distribute fees received
     * Splits between treasury and referral pool
     */
    function distributeFees(uint256 amount, uint8 feeType) external override onlyRole(VAULT_ROLE) {
        require(amount > 0, "Amount must be > 0");
        
        // Record fee type
        if (feeType == FEE_TYPE_DEPOSIT) {
            totalDepositFeesReceived += amount;
        } else if (feeType == FEE_TYPE_PERFORMANCE) {
            totalPerformanceFeesReceived += amount;
        }

        // For deposit fees, the referral distribution is handled by Referral contract
        // For performance fees, split between treasury and referral
        address treasury = config.treasury();
        
        // All fees go to pending treasury balance initially
        // Referral contract will call transferCommission to move funds
        _pendingTreasuryFees += amount;

        emit FeesDistributed(amount, feeType);
    }

    /**
     * @dev Claim accumulated treasury fees
     * Only callable by treasury address
     */
    function claimTreasuryFees() external override nonReentrant {
        require(msg.sender == config.treasury(), "Only treasury can claim");
        uint256 amount = _pendingTreasuryFees;
        require(amount > 0, "No pending fees");

        _pendingTreasuryFees = 0;
        require(usdt.transfer(msg.sender, amount), "Transfer failed");

        emit TreasuryFeesClaimed(amount);
    }

    /**
     * @dev Transfer commission to a user
     * Called by Referral contract to pay out earned commissions
     */
    function transferCommission(address user, uint256 amount) external override onlyRole(REFERRAL_ROLE) nonReentrant {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be > 0");
        require(_pendingTreasuryFees >= amount, "Insufficient fee balance");

        _pendingTreasuryFees -= amount;
        totalReferralCommissionsPaid += amount;
        
        require(usdt.transfer(user, amount), "USDT transfer failed");

        emit CommissionTransferred(user, amount);
    }

    /**
     * @dev Get pending treasury fees
     */
    function getPendingTreasuryFees() external view override returns (uint256) {
        return _pendingTreasuryFees;
    }

    /**
     * @dev Get contract USDT balance
     */
    function getUsdtBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * @dev Grant roles to contracts
     */
    function grantVaultRole(address vault) external onlyRole(ADMIN_ROLE) {
        grantRole(VAULT_ROLE, vault);
    }

    function grantReferralRole(address referral) external onlyRole(ADMIN_ROLE) {
        grantRole(REFERRAL_ROLE, referral);
    }

    /**
     * @dev Update config address
     */
    function setConfig(address _config) external onlyRole(ADMIN_ROLE) {
        config = Config(_config);
    }

    /**
     * @dev Emergency withdraw all USDT (admin only)
     * For emergency situations only
     */
    function emergencyWithdraw() external onlyRole(ADMIN_ROLE) {
        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            require(usdt.transfer(config.treasury(), balance), "Transfer failed");
        }
    }
}
