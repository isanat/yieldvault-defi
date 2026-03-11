// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReferralV3 {
    function getReferrer(address user) external view returns (address);
    function getReferralCode(address user) external view returns (string memory);
    function isRegistered(address user) external view returns (bool);
    function distributeRewards(address user, uint256 amount) external returns (address[] memory, uint256[] memory);
}
