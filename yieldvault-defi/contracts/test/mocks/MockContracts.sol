// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IStrategy.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT for testing
 */
contract MockUSDT is ERC20 {
    uint8 private _decimals = 6;

    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**_decimals);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

/**
 * @title MockStrategy
 * @dev Mock strategy for testing
 */
contract MockStrategy is IStrategy, AccessControl {
    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    IERC20 public immutable override want;
    address public immutable override vault;
    
    uint256 private _balance;
    uint256 public profitPerHarvest;

    constructor(address _vault, address _want) {
        vault = _vault;
        want = IERC20(_want);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(STRATEGIST_ROLE, msg.sender);
        _grantRole(VAULT_ROLE, _vault);
    }

    function deposit(uint256 amount) external override onlyRole(VAULT_ROLE) {
        want.transferFrom(msg.sender, address(this), amount);
        _balance += amount;
        emit Deposited(amount);
    }

    function withdraw(uint256 amount) external override onlyRole(VAULT_ROLE) returns (uint256) {
        require(amount <= _balance, "Insufficient balance");
        _balance -= amount;
        want.transfer(msg.sender, amount);
        emit Withdrawn(amount);
        return amount;
    }

    function harvest() external override onlyRole(STRATEGIST_ROLE) returns (uint256 profit) {
        uint256 balance = want.balanceOf(address(this));
        profit = balance > _balance ? balance - _balance : 0;
        
        if (profit > 0) {
            want.transfer(msg.sender, profit);
            emit Harvested(profit, block.timestamp);
        }
    }

    function balanceOf() external view override returns (uint256) {
        return _balance;
    }

    function emergencyWithdraw() external override returns (uint256 amount) {
        amount = want.balanceOf(address(this));
        want.transfer(vault, amount);
        _balance = 0;
        emit EmergencyWithdrawn(amount);
    }

    function checkHealth() external pure override returns (bool isHealthy, uint256 healthFactor) {
        return (true, type(uint256).max);
    }

    function setProfitPerHarvest(uint256 _profit) external {
        profitPerHarvest = _profit;
    }

    function grantVaultRole(address _vault) external {
        grantRole(VAULT_ROLE, _vault);
    }
}

/**
 * @title MockAavePool
 * @dev Mock Aave Pool for testing
 */
contract MockAavePool {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public debts;
    
    IERC20 public usdt;

    constructor(address _usdt) {
        usdt = IERC20(_usdt);
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        deposits[onBehalfOf] += amount;
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        deposits[msg.sender] -= amount;
        IERC20(asset).transfer(to, amount);
        return amount;
    }

    function borrow(address asset, uint256 amount, uint256, uint16, address onBehalfOf) external {
        require(deposits[onBehalfOf] >= amount * 2, "Insufficient collateral");
        debts[onBehalfOf] += amount;
        IERC20(asset).transfer(msg.sender, amount);
    }

    function repay(address asset, uint256 amount, uint256, address onBehalfOf) external returns (uint256) {
        require(debts[onBehalfOf] >= amount, "No debt");
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        debts[onBehalfOf] -= amount;
        return amount;
    }

    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        totalCollateralBase = deposits[user] * 1e8; // Assuming price oracle returns 1e8
        totalDebtBase = debts[user] * 1e8;
        availableBorrowsBase = totalCollateralBase / 2 - totalDebtBase;
        currentLiquidationThreshold = 8000; // 80%
        ltv = 7500; // 75%
        healthFactor = totalDebtBase > 0 ? (totalCollateralBase * 1e18) / totalDebtBase : type(uint256).max;
    }
}

/**
 * @title MockQuickSwapRouter
 * @dev Mock QuickSwap Router for testing
 */
contract MockQuickSwapRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn; // 1:1 for simplicity
        
        // Mint tokens to receiver (mock)
        IERC20(path[1]).transfer(to, amounts[1]);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBDesired);
        
        amountA = amountADesired;
        amountB = amountBDesired;
        liquidity = amountADesired + amountBDesired;
        
        // For testing, just track the amounts
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB) {
        amountA = liquidity / 2;
        amountB = liquidity / 2;
        
        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);
    }
}
