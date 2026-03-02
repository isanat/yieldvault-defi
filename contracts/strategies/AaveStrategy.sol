// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IStrategy.sol";

/**
 * @title AaveStrategy
 * @dev Yield strategy using Aave V3 on Polygon
 * Implements leveraged lending with controlled LTV
 */
contract AaveStrategy is IStrategy, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // Aave V3 addresses on Polygon
    address public constant AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address public constant AAVE_POOL_ADDRESSES_PROVIDER = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;
    
    // Tokens
    IERC20 public immutable override want; // USDT
    IERC20 public immutable aToken;        // aUSDT
    IERC20 public immutable variableDebtToken; // Variable debt token
    
    address public immutable override vault;
    
    // Strategy parameters
    uint256 public targetLTV = 5000; // 50% LTV in basis points
    uint256 public constant MAX_LTV = 6500; // Max 65% (safety margin)
    uint256 public constant HEALTH_FACTOR_MIN = 1.5e18; // Minimum health factor
    
    // Performance tracking
    uint256 public totalDeposited;
    uint256 public totalProfit;
    uint256 public lastHarvestTimestamp;

    // Events inherited from IStrategy

    constructor(
        address _vault,
        address _want, // USDT
        address _aToken,
        address _variableDebtToken,
        address _admin
    ) {
        vault = _vault;
        want = IERC20(_want);
        aToken = IERC20(_aToken);
        variableDebtToken = IERC20(_variableDebtToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(STRATEGIST_ROLE, _admin);
        _grantRole(VAULT_ROLE, _vault);
    }

    // ============ View Functions ============

    /**
     * @dev Get total assets under management
     */
    function balanceOf() external view override returns (uint256) {
        // Total = aToken balance - debt + want balance in strategy
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        uint256 debt = variableDebtToken.balanceOf(address(this));
        uint256 wantBalance = want.balanceOf(address(this));
        
        if (debt >= aTokenBalance) {
            return wantBalance; // Should not happen in normal operation
        }
        
        return aTokenBalance - debt + wantBalance;
    }

    /**
     * @dev Check strategy health
     */
    function checkHealth() external view override returns (bool isHealthy, uint256 healthFactor) {
        // In production, would call Aave's getUserHealthFactor
        // Simplified version
        uint256 collateral = aToken.balanceOf(address(this));
        uint256 debt = variableDebtToken.balanceOf(address(this));
        
        if (debt == 0) {
            return (true, type(uint256).max);
        }
        
        // Simplified health factor calculation
        // In production, would use Aave's getHealthFactor
        healthFactor = (collateral * 1e18) / debt;
        isHealthy = healthFactor >= HEALTH_FACTOR_MIN;
    }

    // ============ Core Functions ============

    /**
     * @dev Deposit assets into Aave
     */
    function deposit(uint256 amount) external override onlyRole(VAULT_ROLE) {
        require(amount > 0, "Amount must be > 0");
        
        want.safeTransferFrom(msg.sender, address(this), amount);
        want.safeApprove(AAVE_POOL, amount);
        
        // Deposit to Aave
        IPool(AAVE_POOL).supply(address(want), amount, address(this), 0);
        
        totalDeposited += amount;
        
        // Apply leverage if target LTV is set
        if (targetLTV > 0) {
            _applyLeverage();
        }
        
        emit Deposited(amount);
    }

    /**
     * @dev Withdraw assets from Aave
     */
    function withdraw(uint256 amount) external override onlyRole(VAULT_ROLE) returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        
        // Deleverage first if needed
        if (variableDebtToken.balanceOf(address(this)) > 0) {
            _deleverage(amount);
        }
        
        // Withdraw from Aave
        uint256 withdrawn = IPool(AAVE_POOL).withdraw(address(want), amount, address(this));
        
        // Transfer to vault
        want.safeTransfer(msg.sender, withdrawn);
        
        totalDeposited -= amount;
        
        emit Withdrawn(withdrawn);
        return withdrawn;
    }

    /**
     * @dev Harvest rewards and return profit
     */
    function harvest() external override onlyRole(STRATEGIST_ROLE) returns (uint256 profit) {
        uint256 balanceBefore = want.balanceOf(address(this));
        
        // Claim rewards (WMATIC from Aave)
        // In production, would claim and swap to USDT
        // Simplified: just calculate interest earned
        
        uint256 currentBalance = this.balanceOf();
        uint256 profitEarned = 0;
        
        if (currentBalance > totalDeposited) {
            profitEarned = currentBalance - totalDeposited;
        }
        
        // In production:
        // 1. Claim WMATIC rewards
        // 2. Swap WMATIC to USDT via QuickSwap
        // 3. Return profit
        
        profit = want.balanceOf(address(this)) - balanceBefore;
        
        if (profit > 0) {
            totalProfit += profit;
            lastHarvestTimestamp = block.timestamp;
            want.safeTransfer(msg.sender, profit);
        }
        
        emit Harvested(profit, block.timestamp);
    }

    /**
     * @dev Emergency withdraw all assets
     */
    function emergencyWithdraw() external override onlyRole(ADMIN_ROLE) returns (uint256 amount) {
        // Deleverage completely
        uint256 debt = variableDebtToken.balanceOf(address(this));
        if (debt > 0) {
            IPool(AAVE_POOL).repay(address(want), debt, 2, address(this));
        }
        
        // Withdraw all from Aave
        amount = IPool(AAVE_POOL).withdraw(address(want), type(uint256).max, address(this));
        
        // Transfer to vault
        want.safeTransfer(vault, amount);
        
        totalDeposited = 0;
        
        emit EmergencyWithdrawn(amount);
    }

    // ============ Leverage Functions ============

    /**
     * @dev Apply leverage to reach target LTV
     */
    function _applyLeverage() internal {
        // Simplified leverage implementation
        // In production, would:
        // 1. Borrow MATIC/USDT based on collateral
        // 2. Swap borrowed tokens to USDT
        // 3. Re-deposit to Aave
        // 4. Repeat until target LTV reached
        
        uint256 collateral = aToken.balanceOf(address(this));
        uint256 currentDebt = variableDebtToken.balanceOf(address(this));
        
        uint256 targetDebt = (collateral * targetLTV) / 10000;
        
        if (targetDebt > currentDebt) {
            uint256 toBorrow = targetDebt - currentDebt;
            // Borrow USDT (simplified)
            IPool(AAVE_POOL).borrow(address(want), toBorrow, 2, 0, address(this));
            
            // Re-supply borrowed amount
            want.safeApprove(AAVE_POOL, toBorrow);
            IPool(AAVE_POOL).supply(address(want), toBorrow, address(this), 0);
        }
    }

    /**
     * @dev Deleverage position
     */
    function _deleverage(uint256 amountNeeded) internal {
        uint256 debt = variableDebtToken.balanceOf(address(this));
        if (debt == 0) return;
        
        // Withdraw from Aave and repay
        uint256 toWithdraw = amountNeeded;
        if (toWithdraw > 0) {
            IPool(AAVE_POOL).withdraw(address(want), toWithdraw, address(this));
            
            uint256 wantBalance = want.balanceOf(address(this));
            uint256 repayAmount = wantBalance < debt ? wantBalance : debt;
            
            want.safeApprove(AAVE_POOL, repayAmount);
            IPool(AAVE_POOL).repay(address(want), repayAmount, 2, address(this));
        }
    }

    // ============ Admin Functions ============

    /**
     * @dev Set target LTV
     */
    function setTargetLTV(uint256 newLTV) external onlyRole(ADMIN_ROLE) {
        require(newLTV <= MAX_LTV, "LTV too high");
        targetLTV = newLTV;
    }

    /**
     * @dev Rebalance position (called by keeper bot)
     */
    function rebalance() external onlyRole(STRATEGIST_ROLE) {
        (bool isHealthy, ) = this.checkHealth();
        if (!isHealthy) {
            _deleverage(type(uint256).max);
        } else {
            _applyLeverage();
        }
    }

    /**
     * @dev Grant vault role
     */
    function grantVaultRole(address _vault) external onlyRole(ADMIN_ROLE) {
        grantRole(VAULT_ROLE, _vault);
    }
}

/**
 * @title IPool
 * @dev Simplified Aave V3 Pool interface
 */
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
}
