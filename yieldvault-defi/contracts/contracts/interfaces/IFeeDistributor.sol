// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IFeeDistributor
 * @dev Interface for fee distribution
 */
interface IFeeDistributor {
    function distributeFees(uint256 amount, uint8 feeType) external;
    function getPendingFees(address user) external view returns (uint256);
    function claimFees() external returns (uint256);
    function grantVaultRole(address vault) external;
    function grantReferralRole(address referral) external;
}
