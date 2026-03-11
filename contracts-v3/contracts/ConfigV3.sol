// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ConfigV3 is Ownable {
    uint256 public depositFeeBP = 500;
    uint256 public performanceFeeBP = 2000;
    uint256 public managementFeeBP = 200;
    uint256 public withdrawalFeeBP = 0;

    address public vault;
    address public referral;
    address public feeDistributor;
    address public localStrategyManager;

    event FeesUpdated(uint256 depositFee, uint256 performanceFee, uint256 managementFee, uint256 withdrawalFee);
    event VaultUpdated(address vault);
    event ReferralUpdated(address referral);
    event FeeDistributorUpdated(address feeDistributor);
    event LocalStrategyManagerUpdated(address manager);

    constructor(address _owner) {
        _transferOwnership(_owner);
    }

    function setFees(uint256 _depositFeeBP, uint256 _performanceFeeBP, uint256 _managementFeeBP, uint256 _withdrawalFeeBP) external onlyOwner {
        require(_depositFeeBP <= 1000, "Deposit fee max 10%");
        require(_performanceFeeBP <= 3000, "Performance fee max 30%");
        require(_managementFeeBP <= 500, "Management fee max 5%");
        require(_withdrawalFeeBP <= 500, "Withdrawal fee max 5%");
        depositFeeBP = _depositFeeBP;
        performanceFeeBP = _performanceFeeBP;
        managementFeeBP = _managementFeeBP;
        withdrawalFeeBP = _withdrawalFeeBP;
        emit FeesUpdated(_depositFeeBP, _performanceFeeBP, _managementFeeBP, _withdrawalFeeBP);
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
        emit VaultUpdated(_vault);
    }

    function setReferral(address _referral) external onlyOwner {
        referral = _referral;
        emit ReferralUpdated(_referral);
    }

    function setFeeDistributor(address _feeDistributor) external onlyOwner {
        feeDistributor = _feeDistributor;
        emit FeeDistributorUpdated(_feeDistributor);
    }

    function setLocalStrategyManager(address _manager) external onlyOwner {
        localStrategyManager = _manager;
        emit LocalStrategyManagerUpdated(_manager);
    }
}
