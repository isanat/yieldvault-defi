// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Config
 * @dev Global configuration contract for the DeFi platform
 */
contract Config is AccessControl {
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");

    uint256 public performanceFeeBP = 2000;    // 20%
    uint256 public depositFeeBP = 500;         // 5%
    uint256 public managementFeeBP = 200;      // 2%

    uint256[5] public referralCommissionRatesBP;

    address public treasury;
    address public vault;
    address public referralContract;
    address public feeDistributor;
    address public usdtToken;

    bool public depositsEnabled = true;
    bool public withdrawalsEnabled = true;
    bool public harvestEnabled = true;

    event ConfigUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event AddressUpdated(string name, address oldValue, address newValue);
    event ToggleUpdated(string feature, bool enabled);

    constructor(
        address _admin,
        address _treasury,
        address _usdtToken
    ) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(FEE_MANAGER_ROLE, _admin);
        _grantRole(STRATEGIST_ROLE, _admin);

        treasury = _treasury;
        usdtToken = _usdtToken;

        referralCommissionRatesBP = [uint256(4000), 2500, 1500, 1200, 800];
    }

    function setVault(address _vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldValue = vault;
        vault = _vault;
        emit AddressUpdated("vault", oldValue, _vault);
    }

    function setReferralContract(address _referral) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldValue = referralContract;
        referralContract = _referral;
        emit AddressUpdated("referralContract", oldValue, _referral);
    }

    function setFeeDistributor(address _feeDistributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldValue = feeDistributor;
        feeDistributor = _feeDistributor;
        emit AddressUpdated("feeDistributor", oldValue, _feeDistributor);
    }

    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid address");
        address oldValue = treasury;
        treasury = _treasury;
        emit AddressUpdated("treasury", oldValue, _treasury);
    }

    function setDepositsEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        depositsEnabled = enabled;
        emit ToggleUpdated("deposits", enabled);
    }

    function setWithdrawalsEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        withdrawalsEnabled = enabled;
        emit ToggleUpdated("withdrawals", enabled);
    }

    function setHarvestEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        harvestEnabled = enabled;
        emit ToggleUpdated("harvest", enabled);
    }

    function getFeeConfig() external view returns (
        uint256 _performanceFeeBP,
        uint256 _depositFeeBP,
        uint256 _managementFeeBP
    ) {
        return (performanceFeeBP, depositFeeBP, managementFeeBP);
    }

    function getReferralRates() external view returns (uint256[5] memory) {
        return referralCommissionRatesBP;
    }

    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        depositsEnabled = false;
        withdrawalsEnabled = false;
        harvestEnabled = false;
        emit ToggleUpdated("emergency", true);
    }

    function resumeOperations() external onlyRole(DEFAULT_ADMIN_ROLE) {
        depositsEnabled = true;
        withdrawalsEnabled = true;
        harvestEnabled = true;
        emit ToggleUpdated("emergency", false);
    }
}
