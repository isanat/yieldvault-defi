// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IStrategy.sol";

/**
 * @title QuickSwapStrategy
 * @dev Yield strategy using QuickSwap LP on Polygon
 * Provides liquidity to USDT/MATIC pool and harvests fees + rewards
 */
contract QuickSwapStrategy is IStrategy, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // QuickSwap addresses on Polygon
    address public constant ROUTER = 0xa5E0829CaCEd8fFDD4De3c383969347A9Ea31E71;
    address public constant FACTORY = 0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32;
    
    // Tokens
    IERC20 public immutable override want; // USDT
    IERC20 public immutable token1;        // WMATIC
    IERC20 public immutable lpToken;       // USDT-WMATIC LP
    
    address public immutable override vault;
    
    // The LP pair
    address public immutable pair;
    
    // Strategy parameters
    uint256 public slippageTolerance = 100; // 1% default
    
    // Performance tracking
    uint256 public totalDeposited;
    uint256 public totalProfit;
    uint256 public lastHarvestTimestamp;

    constructor(
        address _vault,
        address _want, // USDT
        address _token1, // WMATIC
        address _lpToken,
        address _admin
    ) {
        vault = _vault;
        want = IERC20(_want);
        token1 = IERC20(_token1);
        lpToken = IERC20(_lpToken);
        pair = _lpToken; // LP token is the pair address in UniswapV2
        
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
        uint256 lpBalance = lpToken.balanceOf(address(this));
        if (lpBalance == 0) {
            return want.balanceOf(address(this));
        }
        
        // Calculate LP token value in USDT
        uint256 totalSupply = lpToken.totalSupply();
        (uint256 reserve0, uint256 reserve1,) = IUniswapV2Pair(pair).getReserves();
        
        // Determine which reserve is USDT
        address token0 = IUniswapV2Pair(pair).token0();
        uint256 usdtReserve = token0 == address(want) ? reserve0 : reserve1;
        
        // Our share of USDT in pool
        uint256 ourUsdtShare = (lpBalance * usdtReserve * 2) / totalSupply; // x2 for both sides
        
        // Add any uninvested USDT
        return ourUsdtShare + want.balanceOf(address(this));
    }

    /**
     * @dev Check strategy health (always healthy for LP strategy)
     */
    function checkHealth() external pure override returns (bool isHealthy, uint256 healthFactor) {
        return (true, type(uint256).max);
    }

    // ============ Core Functions ============

    /**
     * @dev Deposit assets into LP
     */
    function deposit(uint256 amount) external override onlyRole(VAULT_ROLE) {
        require(amount > 0, "Amount must be > 0");
        
        want.safeTransferFrom(msg.sender, address(this), amount);
        
        // Add liquidity
        _addLiquidity(amount);
        
        totalDeposited += amount;
        
        emit Deposited(amount);
    }

    /**
     * @dev Withdraw assets from LP
     */
    function withdraw(uint256 amount) external override onlyRole(VAULT_ROLE) returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        
        // Remove liquidity proportionally
        uint256 lpBalance = lpToken.balanceOf(address(this));
        uint256 totalValue = this.balanceOf();
        
        if (lpBalance > 0 && totalValue > 0) {
            uint256 lpToRemove = (amount * lpBalance) / totalValue;
            _removeLiquidity(lpToRemove);
        }
        
        // Transfer withdrawn amount
        uint256 withdrawn = want.balanceOf(address(this));
        if (withdrawn > amount) {
            withdrawn = amount;
        }
        
        want.safeTransfer(msg.sender, withdrawn);
        totalDeposited -= withdrawn;
        
        emit Withdrawn(withdrawn);
        return withdrawn;
    }

    /**
     * @dev Harvest rewards and return profit
     */
    function harvest() external override onlyRole(STRATEGIST_ROLE) returns (uint256 profit) {
        uint256 balanceBefore = want.balanceOf(address(this));
        
        // In production:
        // 1. Harvest QUICK rewards from staking (if LP is staked)
        // 2. Swap QUICK to USDT
        // 3. Compound or return profit
        
        // For now, calculate profit from LP fees
        uint256 currentBalance = this.balanceOf();
        if (currentBalance > totalDeposited) {
            profit = currentBalance - totalDeposited;
        }
        
        // If we have extra USDT from swaps, return it
        uint256 usdtBalance = want.balanceOf(address(this));
        if (usdtBalance > 0 && profit > 0) {
            uint256 profitToReturn = usdtBalance < profit ? usdtBalance : profit;
            want.safeTransfer(msg.sender, profitToReturn);
            profit = profitToReturn;
        }
        
        if (profit > 0) {
            totalProfit += profit;
            lastHarvestTimestamp = block.timestamp;
        }
        
        emit Harvested(profit, block.timestamp);
    }

    /**
     * @dev Emergency withdraw all assets
     */
    function emergencyWithdraw() external override onlyRole(ADMIN_ROLE) returns (uint256 amount) {
        // Remove all liquidity
        uint256 lpBalance = lpToken.balanceOf(address(this));
        if (lpBalance > 0) {
            _removeLiquidity(lpBalance);
        }
        
        // Swap all WMATIC to USDT
        uint256 wmaticBalance = token1.balanceOf(address(this));
        if (wmaticBalance > 0) {
            _swapToken1ToWant(wmaticBalance);
        }
        
        // Transfer all USDT to vault
        amount = want.balanceOf(address(this));
        if (amount > 0) {
            want.safeTransfer(vault, amount);
        }
        
        totalDeposited = 0;
        
        emit EmergencyWithdrawn(amount);
    }

    // ============ Internal Functions ============

    /**
     * @dev Add liquidity to QuickSwap
     */
    function _addLiquidity(uint256 usdtAmount) internal {
        // Calculate how much WMATIC we need (approximately half the USDT value)
        uint256 usdtForSwap = usdtAmount / 2;
        uint256 usdtForLp = usdtAmount - usdtForSwap;
        
        // Swap half USDT to WMATIC
        want.safeApprove(ROUTER, usdtForSwap);
        
        address[] memory path = new address[](2);
        path[0] = address(want);
        path[1] = address(token1);
        
        IUniswapV2Router(ROUTER).swapExactTokensForTokens(
            usdtForSwap,
            0, // Accept any amount
            path,
            address(this),
            block.timestamp
        );
        
        // Add liquidity
        uint256 wmaticBalance = token1.balanceOf(address(this));
        want.safeApprove(ROUTER, usdtForLp);
        token1.safeApprove(ROUTER, wmaticBalance);
        
        IUniswapV2Router(ROUTER).addLiquidity(
            address(want),
            address(token1),
            usdtForLp,
            wmaticBalance,
            0, // Accept any amount
            0, // Accept any amount
            address(this),
            block.timestamp
        );
    }

    /**
     * @dev Remove liquidity from QuickSwap
     */
    function _removeLiquidity(uint256 lpAmount) internal {
        lpToken.safeApprove(ROUTER, lpAmount);
        
        IUniswapV2Router(ROUTER).removeLiquidity(
            address(want),
            address(token1),
            lpAmount,
            0, // Accept any amount
            0, // Accept any amount
            address(this),
            block.timestamp
        );
    }

    /**
     * @dev Swap WMATIC to USDT
     */
    function _swapToken1ToWant(uint256 amount) internal {
        token1.safeApprove(ROUTER, amount);
        
        address[] memory path = new address[](2);
        path[0] = address(token1);
        path[1] = address(want);
        
        IUniswapV2Router(ROUTER).swapExactTokensForTokens(
            amount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    // ============ Admin Functions ============

    function setSlippageTolerance(uint256 _slippage) external onlyRole(ADMIN_ROLE) {
        require(_slippage <= 500, "Slippage too high"); // Max 5%
        slippageTolerance = _slippage;
    }

    function grantVaultRole(address _vault) external onlyRole(ADMIN_ROLE) {
        grantRole(VAULT_ROLE, _vault);
    }
}

// Interfaces
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline
    ) external returns (uint[] memory amounts);
    
    function addLiquidity(
        address tokenA, address tokenB, uint amountADesired, uint amountBDesired,
        uint amountAMin, uint amountBMin, address to, uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    
    function removeLiquidity(
        address tokenA, address tokenB, uint liquidity,
        uint amountAMin, uint amountBMin, address to, uint deadline
    ) external returns (uint amountA, uint amountB);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}
