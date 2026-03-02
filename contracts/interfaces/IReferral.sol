// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IReferral
 * @dev Interface for the Referral system (Unilevel up to 5 levels)
 */
interface IReferral {
    /**
     * @dev Register a referrer for a user
     * @param user User address
     * @param referrer Referrer address
     */
    function registerReferrer(address user, address referrer) external;

    /**
     * @dev Distribute deposit fee commissions to referrers
     * @param user User who made the deposit
     * @param depositAmount Amount deposited
     */
    function distributeDepositFee(address user, uint256 depositAmount) external;

    /**
     * @dev Distribute interest commissions to referrers
     * @param user User who earned the interest
     * @param profitAmount Profit amount
     */
    function distributeInterestFee(address user, uint256 profitAmount) external;

    /**
     * @dev Claim accumulated commissions
     */
    function claimCommissions() external;

    /**
     * @dev Get user's referrer
     * @param user User address
     * @return Referrer address
     */
    function getReferrer(address user) external view returns (address);

    /**
     * @dev Get user's level 1 referrals (direct referrals)
     * @param user User address
     * @return Array of referral addresses
     */
    function getDirectReferrals(address user) external view returns (address[] memory);

    /**
     * @dev Get user's referral statistics
     * @param user User address
     * @return totalReferrals Total number of referrals (all levels)
     * @return totalReferredDeposits Total deposits from referrals
     * @return totalCommissions Total commissions earned
     */
    function getReferralStats(address user) external view returns (
        uint256 totalReferrals,
        uint256 totalReferredDeposits,
        uint256 totalCommissions
    );

    /**
     * @dev Get pending commissions for a user
     * @param user User address
     * @return Pending commission amount
     */
    function getPendingCommissions(address user) external view returns (uint256);

    /**
     * @dev Events
     */
    event ReferrerRegistered(address indexed user, address indexed referrer);
    event DepositCommissionDistributed(address indexed user, address indexed referrer, uint256 amount, uint256 level);
    event InterestCommissionDistributed(address indexed user, address indexed referrer, uint256 amount, uint256 level);
    event CommissionClaimed(address indexed user, uint256 amount);
}
