// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Config.sol";
import "../interfaces/IFeeDistributor.sol";

/**
 * @title Referral
 * @dev 5-level unilevel referral system
 */
contract Referral is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    Config public config;
    IERC20 public usdt;
    IFeeDistributor public feeDistributor;

    mapping(address => address) public referrers;
    mapping(address => address[]) public referrals;
    mapping(address => uint256) public pendingCommissions;
    mapping(address => uint256) public totalCommissionsEarned;

    uint256 public constant MAX_LEVELS = 5;
    uint256[MAX_LEVELS] public commissionRates;

    event ReferrerRegistered(address indexed user, address indexed referrer);
    event CommissionEarned(address indexed user, address indexed from, uint256 amount, uint256 level);
    event CommissionClaimed(address indexed user, uint256 amount);

    constructor(address _config, address _usdt, address _admin) {
        config = Config(_config);
        usdt = IERC20(_usdt);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VAULT_ROLE, _admin);

        // Default: 10%, 5%, 3%, 2%, 1% = 21% total
        commissionRates = [uint256(1000), 500, 300, 200, 100];
    }

    function grantVaultRole(address vault) external onlyRole(ADMIN_ROLE) {
        _grantRole(VAULT_ROLE, vault);
    }

    function setFeeDistributor(address _feeDistributor) external onlyRole(ADMIN_ROLE) {
        feeDistributor = IFeeDistributor(_feeDistributor);
    }

    function registerReferrer(address user, address referrer) external returns (bool) {
        return _registerReferrer(user, referrer);
    }

    function _registerReferrer(address user, address referrer) internal returns (bool) {
        require(user != address(0) && referrer != address(0), "Invalid address");
        require(user != referrer, "Self-referral not allowed");
        require(referrers[user] == address(0), "Already has referrer");

        // Check referrer is not in user's downline (no circular referrals)
        require(!_isInDownline(user, referrer), "Circular referral");

        referrers[user] = referrer;
        referrals[referrer].push(user);

        emit ReferrerRegistered(user, referrer);
        return true;
    }

    function _isInDownline(address potentialReferrer, address user) internal view returns (bool) {
        address current = referrers[potentialReferrer];
        for (uint256 i = 0; i < MAX_LEVELS && current != address(0); i++) {
            if (current == user) return true;
            current = referrers[current];
        }
        return false;
    }

    function getReferrer(address user) external view returns (address) {
        return referrers[user];
    }

    function getReferralCount(address referrer) external view returns (uint256) {
        return referrals[referrer].length;
    }

    function distributeDepositFee(address user, uint256 amount) external onlyRole(VAULT_ROLE) {
        _distributeCommissions(user, amount, 0);
    }

    function distributeInterestFee(address user, uint256 amount) external onlyRole(VAULT_ROLE) {
        _distributeCommissions(user, amount, 1);
    }

    function _distributeCommissions(address user, uint256 amount, uint8 /* feeType */) internal {
        address current = referrers[user];
        uint256 totalDistributed;

        for (uint256 level = 0; level < MAX_LEVELS && current != address(0); level++) {
            uint256 commission = (amount * commissionRates[level]) / 10000;
            
            if (commission > 0) {
                pendingCommissions[current] += commission;
                totalCommissionsEarned[current] += commission;
                totalDistributed += commission;
                
                emit CommissionEarned(current, user, commission, level + 1);
            }
            
            current = referrers[current];
        }

        // Distribute to fee distributor
        if (totalDistributed > 0 && address(feeDistributor) != address(0)) {
            try feeDistributor.distributeFees(totalDistributed, 2) {} catch {}
        }
    }

    function claimCommissions() external returns (uint256) {
        uint256 amount = pendingCommissions[msg.sender];
        require(amount > 0, "No commissions");

        pendingCommissions[msg.sender] = 0;
        
        require(usdt.transfer(msg.sender, amount), "Transfer failed");

        emit CommissionClaimed(msg.sender, amount);
        return amount;
    }

    function getPendingCommissions(address user) external view returns (uint256) {
        return pendingCommissions[user];
    }

    function getReferralTree(address user, uint256 depth) external view returns (
        address[] memory level1,
        address[] memory level2,
        address[] memory level3,
        address[] memory level4,
        address[] memory level5
    ) {
        if (depth >= 1) level1 = referrals[user];
        
        if (depth >= 2) {
            uint256 count;
            for (uint256 i = 0; i < referrals[user].length; i++) {
                count += referrals[referrals[user][i]].length;
            }
            level2 = new address[](count);
            uint256 idx;
            for (uint256 i = 0; i < referrals[user].length; i++) {
                for (uint256 j = 0; j < referrals[referrals[user][i]].length; j++) {
                    level2[idx++] = referrals[referrals[user][i]][j];
                }
            }
        }

        // Levels 3-5 would follow similar pattern
        level3 = new address[](0);
        level4 = new address[](0);
        level5 = new address[](0);

        return (level1, level2, level3, level4, level5);
    }

    function setCommissionRates(uint256[MAX_LEVELS] calldata rates) external onlyRole(ADMIN_ROLE) {
        uint256 total;
        for (uint256 i = 0; i < MAX_LEVELS; i++) {
            commissionRates[i] = rates[i];
            total += rates[i];
        }
        require(total <= 2500, "Total rates exceed 25%");
    }
}
