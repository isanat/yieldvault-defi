// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title Config
 * @dev Global configuration contract for the DeFi platform
 * Stores all configurable parameters with timelock protection
 */
contract Config is AccessControl, Initializable {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");

    // Fee configuration (in basis points, 100 = 1%)
    uint256 public performanceFeeBP; // Fee on profits (e.g., 2000 = 20%)
    uint256 public depositFeeBP;     // Fee on deposits (e.g., 500 = 5%)
    uint256 public managementFeeBP;  // Annual fee on TVL (e.g., 200 = 2%)

    // Referral commission rates per level (in basis points)
    // Level 1-5 percentages of deposit/interest fees
    uint256[5] public referralCommissionRatesBP;

    // Percentage of user's interest that goes to referral network
    uint256 public referralInterestShareBP; // e.g., 1000 = 10% of user's profit

    // Addresses
    address public treasury;
    address public vault;
    address public referralContract;
    address public feeDistributor;
    address public usdtToken;

    // Feature toggles
    bool public depositsEnabled;
    bool public withdrawalsEnabled;
    bool public harvestEnabled;

    // Timelock
    uint256 public constant TIMELOCK_DURATION = 24 hours;
    mapping(bytes32 => uint256) public timelockedChanges;
    mapping(bytes32 => bool) public executedChanges;

    // Events
    event ConfigUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event AddressUpdated(string name, address oldValue, address newValue);
    event ToggleUpdated(string feature, bool enabled);
    event ChangeTimelocked(bytes32 indexed changeId, uint256 executeAfter);
    event ChangeExecuted(bytes32 indexed changeId);
    event ChangeCancelled(bytes32 indexed changeId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     */
    function initialize(
        address _admin,
        address _treasury,
        address _usdtToken
    ) external initializer {
        __AccessControl_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(FEE_MANAGER_ROLE, _admin);
        _grantRole(STRATEGIST_ROLE, _admin);

        treasury = _treasury;
        usdtToken = _usdtToken;

        // Default values
        performanceFeeBP = 2000;    // 20%
        depositFeeBP = 500;         // 5%
        managementFeeBP = 200;      // 2% annually
        referralInterestShareBP = 1000; // 10% of user's profit to referral

        // Default referral commission rates (total = 100% of referral pool)
        referralCommissionRatesBP = [
            4000,  // Level 1: 40%
            2500,  // Level 2: 25%
            1500,  // Level 3: 15%
            1200,  // Level 4: 12%
            800    // Level 5: 8%
        ];

        depositsEnabled = true;
        withdrawalsEnabled = true;
        harvestEnabled = true;
    }

    // ============ View Functions ============

    /**
     * @dev Get all fee configuration
     */
    function getFeeConfig() external view returns (
        uint256 _performanceFeeBP,
        uint256 _depositFeeBP,
        uint256 _managementFeeBP,
        uint256 _referralInterestShareBP
    ) {
        return (performanceFeeBP, depositFeeBP, managementFeeBP, referralInterestShareBP);
    }

    /**
     * @dev Get referral commission rates
     */
    function getReferralRates() external view returns (uint256[5] memory) {
        return referralCommissionRatesBP;
    }

    /**
     * @dev Check if a timelocked change is ready to execute
     */
    function isChangeReady(bytes32 changeId) external view returns (bool) {
        return timelockedChanges[changeId] > 0 && 
               block.timestamp >= timelockedChanges[changeId] &&
               !executedChanges[changeId];
    }

    // ============ Admin Functions (with Timelock) ============

    /**
     * @dev Submit a timelocked change
     */
    function submitTimelockedChange(bytes32 changeId) external onlyRole(ADMIN_ROLE) {
        require(timelockedChanges[changeId] == 0, "Change already pending");
        timelockedChanges[changeId] = block.timestamp + TIMELOCK_DURATION;
        emit ChangeTimelocked(changeId, block.timestamp + TIMELOCK_DURATION);
    }

    /**
     * @dev Cancel a pending timelocked change
     */
    function cancelTimelockedChange(bytes32 changeId) external onlyRole(ADMIN_ROLE) {
        require(timelockedChanges[changeId] > 0, "Change not pending");
        require(!executedChanges[changeId], "Change already executed");
        timelockedChanges[changeId] = 0;
        emit ChangeCancelled(changeId);
    }

    /**
     * @dev Set performance fee (requires timelock)
     */
    function setPerformanceFee(uint256 newFeeBP) external onlyRole(FEE_MANAGER_ROLE) {
        bytes32 changeId = keccak256(abi.encodePacked("performanceFee", newFeeBP));
        require(timelockedChanges[changeId] > 0, "Change not submitted");
        require(block.timestamp >= timelockedChanges[changeId], "Timelock not expired");
        require(!executedChanges[changeId], "Already executed");
        require(newFeeBP <= 5000, "Fee too high"); // Max 50%

        executedChanges[changeId] = true;
        uint256 oldValue = performanceFeeBP;
        performanceFeeBP = newFeeBP;
        emit ConfigUpdated("performanceFee", oldValue, newFeeBP);
        emit ChangeExecuted(changeId);
    }

    /**
     * @dev Set deposit fee (requires timelock)
     */
    function setDepositFee(uint256 newFeeBP) external onlyRole(FEE_MANAGER_ROLE) {
        bytes32 changeId = keccak256(abi.encodePacked("depositFee", newFeeBP));
        require(timelockedChanges[changeId] > 0, "Change not submitted");
        require(block.timestamp >= timelockedChanges[changeId], "Timelock not expired");
        require(!executedChanges[changeId], "Already executed");
        require(newFeeBP <= 1000, "Fee too high"); // Max 10%

        executedChanges[changeId] = true;
        uint256 oldValue = depositFeeBP;
        depositFeeBP = newFeeBP;
        emit ConfigUpdated("depositFee", oldValue, newFeeBP);
        emit ChangeExecuted(changeId);
    }

    /**
     * @dev Set referral commission rates
     */
    function setReferralCommissionRates(uint256[5] calldata newRates) external onlyRole(ADMIN_ROLE) {
        bytes32 changeId = keccak256(abi.encodePacked("referralRates", newRates));
        require(timelockedChanges[changeId] > 0, "Change not submitted");
        require(block.timestamp >= timelockedChanges[changeId], "Timelock not expired");
        require(!executedChanges[changeId], "Already executed");

        // Verify rates sum to 100%
        uint256 total;
        for (uint256 i = 0; i < 5; i++) {
            total += newRates[i];
        }
        require(total == 10000, "Rates must sum to 100%");

        executedChanges[changeId] = true;
        referralCommissionRatesBP = newRates;
        emit ConfigUpdated("referralRates", 0, total);
        emit ChangeExecuted(changeId);
    }

    // ============ Address Setters (Admin only) ============

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid address");
        address oldValue = treasury;
        treasury = newTreasury;
        emit AddressUpdated("treasury", oldValue, newTreasury);
    }

    function setVault(address newVault) external onlyRole(ADMIN_ROLE) {
        address oldValue = vault;
        vault = newVault;
        emit AddressUpdated("vault", oldValue, newVault);
    }

    function setReferralContract(address newReferral) external onlyRole(ADMIN_ROLE) {
        address oldValue = referralContract;
        referralContract = newReferral;
        emit AddressUpdated("referralContract", oldValue, newReferral);
    }

    function setFeeDistributor(address newFeeDistributor) external onlyRole(ADMIN_ROLE) {
        address oldValue = feeDistributor;
        feeDistributor = newFeeDistributor;
        emit AddressUpdated("feeDistributor", oldValue, newFeeDistributor);
    }

    // ============ Toggle Functions ============

    function setDepositsEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        depositsEnabled = enabled;
        emit ToggleUpdated("deposits", enabled);
    }

    function setWithdrawalsEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        withdrawalsEnabled = enabled;
        emit ToggleUpdated("withdrawals", enabled);
    }

    function setHarvestEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        harvestEnabled = enabled;
        emit ToggleUpdated("harvest", enabled);
    }

    // ============ Emergency Functions ============

    /**
     * @dev Emergency pause all operations
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        depositsEnabled = false;
        withdrawalsEnabled = false;
        harvestEnabled = false;
        emit ToggleUpdated("emergency", true);
    }

    /**
     * @dev Resume operations after emergency pause
     */
    function resumeOperations() external onlyRole(ADMIN_ROLE) {
        depositsEnabled = true;
        withdrawalsEnabled = true;
        harvestEnabled = true;
        emit ToggleUpdated("emergency", false);
    }
}
