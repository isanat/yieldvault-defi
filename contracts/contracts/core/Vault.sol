// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IReferral.sol";
import "../interfaces/IFeeDistributor.sol";
import "./Config.sol";

/**
 * @title Vault
 * @dev ERC4626 vault with multi-strategy support and referral system
 */
contract Vault is ERC4626, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    Config public config;
    IReferral public referralContract;
    IFeeDistributor public feeDistributor;

    IStrategy[] public strategies;
    uint256[] public allocations;
    
    uint256 public totalProfitHarvested;
    uint256 public lastHarvestTimestamp;

    uint256 public constant MAX_STRATEGIES = 10;
    uint256 public constant TOTAL_ALLOCATION = 10000;

    event DepositWithReferrer(address indexed sender, address indexed receiver, uint256 assets, uint256 shares, address referrer);
    event StrategyAdded(address indexed strategy, uint256 allocation);
    event StrategyRemoved(address indexed strategy);
    event Harvest(uint256 totalProfit, uint256 performanceFee, uint256 timestamp);

    constructor(
        address _asset,
        address _config,
        address _admin
    ) ERC4626(IERC20(_asset)) ERC20("YieldVault Share", "yvSHARE") {
        config = Config(_config);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(STRATEGIST_ROLE, _admin);
    }

    function setReferralContract(address _referral) external onlyRole(ADMIN_ROLE) {
        referralContract = IReferral(_referral);
    }

    function setFeeDistributor(address _feeDistributor) external onlyRole(ADMIN_ROLE) {
        feeDistributor = IFeeDistributor(_feeDistributor);
    }

    function addStrategy(address strategy, uint256 allocation) external onlyRole(ADMIN_ROLE) {
        require(strategies.length < MAX_STRATEGIES, "Max strategies");
        require(strategy != address(0), "Invalid strategy");
        
        uint256 currentTotal = _getTotalAllocation();
        require(currentTotal + allocation <= TOTAL_ALLOCATION, "Exceeds 100%");

        strategies.push(IStrategy(strategy));
        allocations.push(allocation);

        emit StrategyAdded(strategy, allocation);
    }

    function removeStrategy(uint256 strategyIndex) external onlyRole(ADMIN_ROLE) {
        require(strategyIndex < strategies.length, "Invalid index");

        IStrategy strategy = strategies[strategyIndex];
        uint256 stratBalance = strategy.balanceOf();
        if (stratBalance > 0) {
            try strategy.withdraw(stratBalance) {} catch {}
        }

        address strategyAddress = address(strategies[strategyIndex]);
        strategies[strategyIndex] = strategies[strategies.length - 1];
        allocations[strategyIndex] = allocations[allocations.length - 1];
        strategies.pop();
        allocations.pop();

        emit StrategyRemoved(strategyAddress);
    }

    function depositWithReferrer(uint256 assets, address receiver, address referrer) external nonReentrant returns (uint256) {
        require(config.depositsEnabled(), "Deposits disabled");
        require(assets > 0, "Amount > 0");

        if (address(referralContract) != address(0) && referrer != address(0)) {
            try referralContract.registerReferrer(receiver, referrer) {} catch {}
        }

        uint256 shares = super.deposit(assets, receiver);
        
        emit DepositWithReferrer(msg.sender, receiver, assets, shares, referrer);
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner) public override nonReentrant returns (uint256) {
        require(config.withdrawalsEnabled(), "Withdrawals disabled");
        return super.withdraw(assets, receiver, owner);
    }

    function harvest() external onlyRole(STRATEGIST_ROLE) nonReentrant {
        require(config.harvestEnabled(), "Harvest disabled");

        uint256 totalProfit;
        
        for (uint256 i = 0; i < strategies.length; i++) {
            try strategies[i].harvest() returns (uint256 profit) {
                totalProfit += profit;
            } catch {}
        }

        if (totalProfit == 0) return;

        uint256 performanceFeeBP = config.performanceFeeBP();
        uint256 performanceFee = (totalProfit * performanceFeeBP) / 10000;

        if (performanceFee > 0 && address(feeDistributor) != address(0)) {
            try feeDistributor.distributeFees(performanceFee, 1) {} catch {}
        }

        totalProfitHarvested += totalProfit;
        lastHarvestTimestamp = block.timestamp;

        emit Harvest(totalProfit, performanceFee, block.timestamp);
    }

    function totalAssets() public view override returns (uint256) {
        uint256 total = IERC20(asset()).balanceOf(address(this));
        
        for (uint256 i = 0; i < strategies.length; i++) {
            total += strategies[i].balanceOf();
        }
        
        return total;
    }

    function getStrategies() external view returns (address[] memory, uint256[] memory) {
        address[] memory strategyAddresses = new address[](strategies.length);
        for (uint256 i = 0; i < strategies.length; i++) {
            strategyAddresses[i] = address(strategies[i]);
        }
        return (strategyAddresses, allocations);
    }

    function _getTotalAllocation() internal view returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < allocations.length; i++) {
            total += allocations[i];
        }
        return total;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw() external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < strategies.length; i++) {
            try strategies[i].emergencyWithdraw() {} catch {}
        }
    }
}
