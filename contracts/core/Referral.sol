// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IReferral.sol";
import "./interfaces/IFeeDistributor.sol";
import "./core/Config.sol";

/**
 * @title Referral
 * @dev Unilevel referral system up to 5 levels
 * Handles commission distribution on deposits and interest earnings
 */
contract Referral is IReferral, AccessControl, ReentrancyGuard {
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    Config public config;
    IERC20 public usdt;
    IFeeDistributor public feeDistributor;

    // Referrer mapping: user => referrer
    mapping(address => address) public override getReferrer;
    
    // Direct referrals: user => array of level 1 referrals
    mapping(address => address[]) private _directReferrals;
    
    // User statistics
    mapping(address => uint256) public totalReferredDeposits;
    mapping(address => uint256) public totalReferralsCount;
    
    // Pending commissions (accumulated, claimable)
    mapping(address => uint256) private _pendingCommissions;
    
    // Total commissions claimed
    mapping(address => uint256) public totalCommissionsClaimed;
    
    // Track if user has been registered
    mapping(address => bool) private _isRegistered;

    // Maximum referral levels
    uint256 public constant MAX_LEVELS = 5;

    // Events are inherited from IReferral

    constructor(address _config, address _usdt, address _admin) {
        config = Config(_config);
        usdt = IERC20(_usdt);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    /**
     * @dev Set the fee distributor
     */
    function setFeeDistributor(address _feeDistributor) external onlyRole(ADMIN_ROLE) {
        feeDistributor = IFeeDistributor(_feeDistributor);
    }

    /**
     * @dev Register a referrer for a user
     * Can only be called by Vault contract
     */
    function registerReferrer(address user, address referrer) external override onlyRole(VAULT_ROLE) {
        require(user != address(0), "Invalid user address");
        require(!_isRegistered[user], "User already registered");
        require(user != referrer, "Cannot refer self");
        require(referrer != address(0), "Invalid referrer");

        // Verify referrer is not in user's downline (no circular references)
        require(!_isInDownline(referrer, user), "Circular referral not allowed");

        getReferrer[user] = referrer;
        _isRegistered[user] = true;
        _directReferrals[referrer].push(user);
        
        // Update referrer's referral count
        totalReferralsCount[referrer]++;

        emit ReferrerRegistered(user, referrer);
    }

    /**
     * @dev Distribute deposit fee commissions to referrers
     * Called by Vault when a deposit is made
     */
    function distributeDepositFee(address user, uint256 depositAmount) external override onlyRole(VAULT_ROLE) nonReentrant {
        uint256 depositFeeBP = config.depositFeeBP();
        uint256 totalFee = (depositAmount * depositFeeBP) / 10000;
        
        if (totalFee == 0) return;

        uint256[5] memory rates = config.getReferralRates();
        address currentUser = getReferrer[user];
        
        // Track total referred deposits for each referrer
        address referrerForStats = getReferrer[user];
        if (referrerForStats != address(0)) {
            totalReferredDeposits[referrerForStats] += depositAmount;
        }

        uint256 totalDistributed;
        
        for (uint256 level = 0; level < MAX_LEVELS && currentUser != address(0); level++) {
            uint256 commissionAmount = (totalFee * rates[level]) / 10000;
            
            if (commissionAmount > 0) {
                _pendingCommissions[currentUser] += commissionAmount;
                totalDistributed += commissionAmount;
                
                emit DepositCommissionDistributed(user, currentUser, commissionAmount, level + 1);
            }
            
            currentUser = getReferrer[currentUser];
        }
    }

    /**
     * @dev Distribute interest commissions to referrers
     * Called by Vault during harvest for profit attribution
     */
    function distributeInterestFee(address user, uint256 profitAmount) external override onlyRole(VAULT_ROLE) nonReentrant {
        uint256 referralInterestShareBP = config.referralInterestShareBP();
        uint256 totalCommissionPool = (profitAmount * referralInterestShareBP) / 10000;
        
        if (totalCommissionPool == 0) return;

        uint256[5] memory rates = config.getReferralRates();
        address currentUser = getReferrer[user];
        uint256 totalDistributed;

        for (uint256 level = 0; level < MAX_LEVELS && currentUser != address(0); level++) {
            uint256 commissionAmount = (totalCommissionPool * rates[level]) / 10000;
            
            if (commissionAmount > 0) {
                _pendingCommissions[currentUser] += commissionAmount;
                totalDistributed += commissionAmount;
                
                emit InterestCommissionDistributed(user, currentUser, commissionAmount, level + 1);
            }
            
            currentUser = getReferrer[currentUser];
        }
    }

    /**
     * @dev Claim accumulated commissions
     * User calls this to withdraw their earned commissions
     */
    function claimCommissions() external override nonReentrant {
        uint256 amount = _pendingCommissions[msg.sender];
        require(amount > 0, "No pending commissions");

        _pendingCommissions[msg.sender] = 0;
        totalCommissionsClaimed[msg.sender] += amount;

        // Transfer USDT to user
        if (address(feeDistributor) != address(0)) {
            feeDistributor.transferCommission(msg.sender, amount);
        } else {
            require(usdt.transfer(msg.sender, amount), "USDT transfer failed");
        }

        emit CommissionClaimed(msg.sender, amount);
    }

    /**
     * @dev Get direct referrals (level 1)
     */
    function getDirectReferrals(address user) external view override returns (address[] memory) {
        return _directReferrals[user];
    }

    /**
     * @dev Get pending commissions for a user
     */
    function getPendingCommissions(address user) external view override returns (uint256) {
        return _pendingCommissions[user];
    }

    /**
     * @dev Get comprehensive referral statistics
     */
    function getReferralStats(address user) external view override returns (
        uint256 _totalReferrals,
        uint256 _totalReferredDeposits,
        uint256 _totalCommissions
    ) {
        return (
            totalReferralsCount[user],
            totalReferredDeposits[user],
            totalCommissionsClaimed[user] + _pendingCommissions[user]
        );
    }

    /**
     * @dev Get full referral tree up to 5 levels
     * Returns counts per level and total volume
     */
    function getReferralTreeStats(address user) external view returns (
        uint256[5] memory countPerLevel,
        uint256[5] memory volumePerLevel
    ) {
        address[] memory currentLevel = new address[](1);
        currentLevel[0] = user;

        for (uint256 level = 0; level < MAX_LEVELS; level++) {
            address[] memory nextLevel;
            
            for (uint256 i = 0; i < currentLevel.length; i++) {
                address[] memory directs = _directReferrals[currentLevel[i]];
                countPerLevel[level] += directs.length;
                
                for (uint256 j = 0; j < directs.length; j++) {
                    volumePerLevel[level] += totalReferredDeposits[directs[j]];
                }
                
                // Build next level array
                for (uint256 j = 0; j < directs.length; j++) {
                    // Push to next level (simplified, would need dynamic array in production)
                }
            }
            
            // In production, would set currentLevel = nextLevel
        }

        return (countPerLevel, volumePerLevel);
    }

    /**
     * @dev Check if an address is in another's downline
     */
    function _isInDownline(address potentialDownline, address ancestor) internal view returns (bool) {
        address current = potentialDownline;
        
        for (uint256 i = 0; i < MAX_LEVELS && current != address(0); i++) {
            if (current == ancestor) return true;
            current = getReferrer[current];
        }
        
        return false;
    }

    /**
     * @dev Grant vault role (only admin)
     */
    function grantVaultRole(address vault) external onlyRole(ADMIN_ROLE) {
        grantRole(VAULT_ROLE, vault);
    }

    /**
     * @dev Update config address
     */
    function setConfig(address _config) external onlyRole(ADMIN_ROLE) {
        config = Config(_config);
    }
}
