// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IReferral
 * @dev Interface for the referral system
 */
interface IReferral {
    function registerReferrer(address user, address referrer) external;
    function getReferrer(address user) external view returns (address);
    function getReferralCount(address referrer) external view returns (uint256);
    function getPendingCommissions(address user) external view returns (uint256);
    function claimCommissions() external returns (uint256);
    function distributeDepositFee(address user, uint256 amount) external;
    function distributeInterestFee(address user, uint256 amount) external;
}
