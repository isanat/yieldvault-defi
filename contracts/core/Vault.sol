// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IReferral.sol";
import "./interfaces/IFeeDistributor.sol";
import "./core/Config.sol";

/**
 * @title Vault
 * @dev Main vault contract implementing ERC4626 with multi-strategy support
 * Manages deposits, withdrawals, and yield generation through strategies
 */
contract Vault is ERC4626, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    Config public config;
    IReferral public referralContract;
    IFeeDistributor public feeDistributor;

    // Strategies and allocations
    IStrategy[] public strategies;
    uint256[] public allocations; // In basis points, sum = 10000 = 100%
    
    // User profit tracking for referral commissions
    mapping(address => uint256) public userAccumulatedProfit;
    mapping(address => uint256) public userLastSharePrice;
    
    // Total profit harvested
    uint256 public totalProfitHarvested;
    uint256 public lastHarvestTimestamp;

    // Constants
    uint256 public constant MAX_STRATEGIES = 10;
    uint256 public constant TOTAL_ALLOCATION = 10000; // 100%

    // Events (additional to IVault)
    event UserProfitUpdated(address indexed user, uint256 profit, uint256 newAccumulated);
    event StrategiesRebalanced(uint256[] newAllocations);
    event EmergencyAction(string action, address indexed caller);

    constructor(
        address _asset, // USDT address
        address _config,
        address _admin
    ) ERC4626(IERC20(_asset), "YieldVault Share", "yvSHARE") ERC20("YieldVault Share", "yvSHARE") {
        config = Config(_config);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(STRATEGIST_ROLE, _admin);
    }

    // ============ Configuration Functions ============

    function setReferralContract(address _referral) external onlyRole(ADMIN_ROLE) {
        referralContract = IReferral(_referral);
    }

    function setFeeDistributor(address _feeDistributor) external onlyRole(ADMIN_ROLE) {
        feeDistributor = IFeeDistributor(_feeDistributor);
    }

    function setConfig(address _config) external onlyRole(ADMIN_ROLE) {
        config = Config(_config);
    }

    // ============ Strategy Management ============

    /**
     * @dev Add a new strategy
     */
    function addStrategy(address strategy, uint256 allocation) external onlyRole(ADMIN_ROLE) {
        require(strategies.length < MAX_STRATEGIES, "Max strategies reached");
        require(strategy != address(0), "Invalid strategy address");
        require(allocation <= TOTAL_ALLOCATION, "Invalid allocation");

        // Verify total allocation doesn't exceed 100%
        uint256 currentTotal = _getTotalAllocation();
        require(currentTotal + allocation <= TOTAL_ALLOCATION, "Allocation exceeds 100%");

        strategies.push(IStrategy(strategy));
        allocations.push(allocation);

        emit StrategyAdded(strategy, allocation);
    }

    /**
     * @dev Remove a strategy
     */
    function removeStrategy(uint256 strategyIndex) external onlyRole(ADMIN_ROLE) {
        require(strategyIndex < strategies.length, "Invalid index");

        // Withdraw all funds from strategy first
        IStrategy strategy = strategies[strategyIndex];
        uint256 stratBalance = strategy.balanceOf();
        if (stratBalance > 0) {
            strategy.withdraw(stratBalance);
        }

        // Remove from arrays
        address strategyAddress = address(strategies[strategyIndex]);
        strategies[strategyIndex] = strategies[strategies.length - 1];
        allocations[strategyIndex] = allocations[allocations.length - 1];
        strategies.pop();
        allocations.pop();

        emit StrategyRemoved(strategyAddress);
    }

    /**
     * @dev Rebalance strategies with new allocations
     */
    function rebalanceStrategies(uint256[] calldata newAllocations) external onlyRole(STRATEGIST_ROLE) {
        require(newAllocations.length == strategies.length, "Length mismatch");
        
        uint256 total;
        for (uint256 i = 0; i < newAllocations.length; i++) {
            total += newAllocations[i];
        }
        require(total == TOTAL_ALLOCATION, "Allocations must sum to 100%");

        // Calculate differences and move funds
        for (uint256 i = 0; i < strategies.length; i++) {
            uint256 currentBalance = strategies[i].balanceOf();
            uint256 targetBalance = (totalAssets() * newAllocations[i]) / TOTAL_ALLOCATION;
            
            if (targetBalance > currentBalance) {
                // Need to deposit more
                uint256 toDeposit = targetBalance - currentBalance;
                if (asset.balanceOf(address(this)) >= toDeposit) {
                    asset.safeTransfer(address(strategies[i]), toDeposit);
                    strategies[i].deposit(toDeposit);
                }
            } else if (targetBalance < currentBalance) {
                // Need to withdraw
                uint256 toWithdraw = currentBalance - targetBalance;
                strategies[i].withdraw(toWithdraw);
            }
        }

        allocations = newAllocations;
        emit StrategiesRebalanced(newAllocations);
        emit Rebalanced(newAllocations);
    }

    // ============ Deposit Override ============

    /**
     * @dev Deposit assets with optional referrer
     */
    function deposit(uint256 assets, address receiver, address referrer) external nonReentrant returns (uint256 shares) {
        require(config.depositsEnabled(), "Deposits disabled");
        require(assets > 0, "Amount must be > 0");

        // Check/referrer registration
        if (address(referralContract) != address(0)) {
            if (referrer != address(0) && referralContract.getReferrer(receiver) == address(0)) {
                referralContract.registerReferrer(receiver, referrer);
            }
        }

        // Record user's last share price for profit tracking
        if (balanceOf(receiver) == 0) {
            userLastSharePrice[receiver] = _sharePrice();
        }

        // Perform deposit
        shares = super.deposit(assets, receiver);

        // Distribute deposit fee
        _distributeDepositFee(assets);

        emit Deposit(msg.sender, receiver, assets, shares, referrer);
    }

    /**
     * @dev Override standard deposit to use our custom one
     */
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        return deposit(assets, receiver, address(0));
    }

    // ============ Withdraw Override ============

    function withdraw(uint256 assets, address receiver, address owner) public override nonReentrant returns (uint256) {
        require(config.withdrawalsEnabled(), "Withdrawals disabled");
        
        // Update user profit tracking before withdrawal
        _updateUserProfit(owner);

        uint256 shares = super.withdraw(assets, receiver, owner);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return shares;
    }

    // ============ Harvest ============

    /**
     * @dev Harvest profits from all strategies
     * Can only be called by strategist or keeper bot
     */
    function harvest() external onlyRole(STRATEGIST_ROLE) nonReentrant {
        require(config.harvestEnabled(), "Harvest disabled");

        uint256 totalProfit;
        uint256 vaultBalanceBefore = asset.balanceOf(address(this));

        // Harvest from each strategy
        for (uint256 i = 0; i < strategies.length; i++) {
            try strategies[i].harvest() returns (uint256 profit) {
                totalProfit += profit;
            } catch {
                // Continue with other strategies if one fails
                continue;
            }
        }

        if (totalProfit == 0) return;

        // Calculate performance fee
        uint256 performanceFeeBP = config.performanceFeeBP();
        uint256 performanceFee = (totalProfit * performanceFeeBP) / 10000;
        uint256 netProfit = totalProfit - performanceFee;

        // Send performance fee to distributor
        if (performanceFee > 0 && address(feeDistributor) != address(0)) {
            asset.safeTransfer(address(feeDistributor), performanceFee);
            feeDistributor.distributeFees(performanceFee, 1); // 1 = performance fee
        }

        // Distribute referral commissions on interest
        if (netProfit > 0 && address(referralContract) != address(0)) {
            _distributeInterestCommissions(netProfit);
        }

        // Update total harvested
        totalProfitHarvested += totalProfit;
        lastHarvestTimestamp = block.timestamp;

        emit Harvest(totalProfit, performanceFee, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @dev Get total assets under management
     * Includes vault balance + all strategy balances
     */
    function totalAssets() public view override returns (uint256) {
        uint256 total = asset.balanceOf(address(this));
        
        for (uint256 i = 0; i < strategies.length; i++) {
            total += strategies[i].balanceOf();
        }
        
        return total;
    }

    /**
     * @dev Get current share price
     */
    function _sharePrice() internal view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e18; // Initial share price
        return (totalAssets() * 1e18) / supply;
    }

    function sharePrice() external view returns (uint256) {
        return _sharePrice();
    }

    /**
     * @dev Get strategy count
     */
    function strategyCount() external view returns (uint256) {
        return strategies.length;
    }

    /**
     * @dev Get all strategies and allocations
     */
    function getStrategies() external view returns (address[] memory, uint256[] memory) {
        address[] memory strategyAddresses = new address[](strategies.length);
        for (uint256 i = 0; i < strategies.length; i++) {
            strategyAddresses[i] = address(strategies[i]);
        }
        return (strategyAddresses, allocations);
    }

    /**
     * @dev Get user's referrer
     */
    function getReferrer(address user) external view returns (address) {
        if (address(referralContract) != address(0)) {
            return referralContract.getReferrer(user);
        }
        return address(0);
    }

    // ============ Internal Functions ============

    function _getTotalAllocation() internal view returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < allocations.length; i++) {
            total += allocations[i];
        }
        return total;
    }

    function _distributeDepositFee(uint256 depositAmount) internal {
        uint256 depositFeeBP = config.depositFeeBP();
        if (depositFeeBP == 0) return;

        uint256 feeAmount = (depositAmount * depositFeeBP) / 10000;
        if (feeAmount == 0) return;

        // For deposit fees, we deduct from user's deposit
        // The fee goes to referral contract to distribute
        if (address(feeDistributor) != address(0)) {
            asset.safeTransfer(address(feeDistributor), feeAmount);
            feeDistributor.distributeFees(feeAmount, 0); // 0 = deposit fee
        }

        // Distribute to referral network
        if (address(referralContract) != address(0)) {
            referralContract.distributeDepositFee(msg.sender, depositAmount);
        }
    }

    function _distributeInterestCommissions(uint256 netProfit) internal {
        // In production, would iterate through users or use accumulated tracking
        // For gas efficiency, we use a simplified model where referral contract
        // tracks and distributes based on user participation
        referralContract.distributeInterestFee(msg.sender, netProfit);
    }

    function _updateUserProfit(address user) internal {
        uint256 currentSharePrice = _sharePrice();
        uint256 lastPrice = userLastSharePrice[user];
        
        if (lastPrice > 0 && currentSharePrice > lastPrice) {
            uint256 userShares = balanceOf(user);
            uint256 profit = ((currentSharePrice - lastPrice) * userShares) / 1e18;
            userAccumulatedProfit[user] += profit;
            userLastSharePrice[user] = currentSharePrice;
            
            emit UserProfitUpdated(user, profit, userAccumulatedProfit[user]);
        }
    }

    // ============ Before/After Token Transfer Hooks ============

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        
        // Update profit tracking for both sender and receiver
        if (from != address(0)) {
            _updateUserProfit(from);
            userLastSharePrice[from] = _sharePrice();
        }
        if (to != address(0) && from != address(0)) {
            userLastSharePrice[to] = _sharePrice();
        }
    }

    // ============ Emergency Functions ============

    /**
     * @dev Pause all operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit EmergencyAction("pause", msg.sender);
    }

    /**
     * @dev Unpause operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit EmergencyAction("unpause", msg.sender);
    }

    /**
     * @dev Emergency withdraw from all strategies
     */
    function emergencyWithdrawAll() external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < strategies.length; i++) {
            try strategies[i].emergencyWithdraw() {
                // Continue
            } catch {
                // Continue with other strategies
            }
        }
        emit EmergencyAction("emergency_withdraw", msg.sender);
    }

    /**
     * @dev Sweep accidental token transfers
     */
    function sweepToken(address token) external onlyRole(ADMIN_ROLE) {
        require(token != address(asset), "Cannot sweep vault asset");
        IERC20 sweepable = IERC20(token);
        uint256 balance = sweepable.balanceOf(address(this));
        if (balance > 0) {
            sweepable.safeTransfer(config.treasury(), balance);
        }
    }
}

// Library for safe transfers
library SafeTransfer {
    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        require(token.transfer(to, amount), "Transfer failed");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        require(token.transferFrom(from, to, amount), "TransferFrom failed");
    }
}

using SafeTransfer for IERC20;
