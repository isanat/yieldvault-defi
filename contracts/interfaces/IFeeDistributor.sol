// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IFeeDistributor
 * @dev Interface for fee distribution to treasury and referral system
 */
interface IFeeDistributor {
    /**
     * @dev Distribute fees received
     * @param amount Total fee amount in USDT
     * @param feeType Type of fee (0 = deposit, 1 = performance)
     */
    function distributeFees(uint256 amount, uint8 feeType) external;

    /**
     * @dev Claim accumulated fees (for treasury)
     */
    function claimTreasuryFees() external;

    /**
     * @dev Transfer commission to a user (called by Referral contract)
     * @param user User address
     * @param amount Amount to transfer
     */
    function transferCommission(address user, uint256 amount) external;

    /**
     * @dev Get pending treasury fees
     * @return Pending fee amount
     */
    function getPendingTreasuryFees() external view returns (uint256);

    /**
     * @dev Events
     */
    event FeesDistributed(uint256 amount, uint8 feeType);
    event TreasuryFeesClaimed(uint256 amount);
    event CommissionTransferred(address indexed user, uint256 amount);
}
