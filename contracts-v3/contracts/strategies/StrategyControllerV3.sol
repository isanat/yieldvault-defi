// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IStrategy.sol";

/**
 * @title StrategyControllerV3
 * @notice Gerencia multiplas estrategias e distribui capital entre elas
 * @dev Admin controla alocacao, o investidor nao sabe qual estrategia esta ativa
 */
contract StrategyControllerV3 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ========== Structs ==========
    struct StrategyInfo {
        address strategy;
        string name;
        uint256 allocation; // 0-10000 (0-100%)
        bool active;
        uint256 lastHarvest;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
    }

    // ========== State ==========
    IERC20 public immutable want;

    address[] public strategyList;
    mapping(address => StrategyInfo) public strategies;
    mapping(address => bool) public isStrategy;

    address public vault;
    uint256 public totalAllocation;

    // ========== Events ==========
    event StrategyAdded(address indexed strategy, string name, uint256 allocation);
    event StrategyRemoved(address indexed strategy);
    event AllocationUpdated(address indexed strategy, uint256 newAllocation);
    event Deposited(address indexed strategy, uint256 amount);
    event Withdrawn(address indexed strategy, uint256 amount);
    event Harvested(address indexed strategy, uint256 profit, uint256 loss);
    event Rebalanced();

    // ========== Modifiers ==========
    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    modifier validStrategy(address _strategy) {
        require(isStrategy[_strategy], "Invalid strategy");
        _;
    }

    // ========== Constructor ==========
    constructor(
        address _want,
        address _vault,
        address _owner
    ) Ownable() {
        want = IERC20(_want);
        vault = _vault;
        _transferOwnership(_owner);
    }

    // ========== View Functions ==========

    function getAllStrategies() external view returns (StrategyInfo[] memory) {
        StrategyInfo[] memory result = new StrategyInfo[](strategyList.length);
        for (uint256 i = 0; i < strategyList.length; i++) {
            result[i] = strategies[strategyList[i]];
        }
        return result;
    }

    function getActiveStrategies() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategies[strategyList[i]].active) count++;
        }

        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategies[strategyList[i]].active) {
                result[index] = strategyList[i];
                index++;
            }
        }
        return result;
    }

    function totalAssets() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategies[strategyList[i]].active) {
                total += IStrategy(strategyList[i]).totalAssets();
            }
        }
        return total + want.balanceOf(address(this));
    }

    function averageAPY() external view returns (uint256) {
        uint256 totalWeightedAPY = 0;
        uint256 totalAlloc = 0;

        for (uint256 i = 0; i < strategyList.length; i++) {
            StrategyInfo memory info = strategies[strategyList[i]];
            if (info.active && info.allocation > 0) {
                totalWeightedAPY += IStrategy(info.strategy).estimatedAPY() * info.allocation;
                totalAlloc += info.allocation;
            }
        }

        return totalAlloc > 0 ? totalWeightedAPY / totalAlloc : 0;
    }

    // ========== Deposit & Withdraw ==========

    function deposit(uint256 _amount) external onlyVault whenNotPaused nonReentrant {
        require(_amount > 0, "Zero amount");

        want.safeTransferFrom(msg.sender, address(this), _amount);

        for (uint256 i = 0; i < strategyList.length; i++) {
            StrategyInfo storage info = strategies[strategyList[i]];
            if (info.active && info.allocation > 0) {
                uint256 strategyAmount = (_amount * info.allocation) / 10000;
                if (strategyAmount > 0) {
                    want.safeApprove(info.strategy, strategyAmount);
                    IStrategy(info.strategy).deposit(strategyAmount);
                    info.totalDeposited += strategyAmount;
                    emit Deposited(info.strategy, strategyAmount);
                }
            }
        }
    }

    function withdraw(uint256 _amount) external onlyVault nonReentrant {
        require(_amount > 0, "Zero amount");

        uint256 remaining = _amount;
        uint256 idleBalance = want.balanceOf(address(this));

        if (idleBalance >= remaining) {
            want.safeTransfer(msg.sender, remaining);
            return;
        }

        if (idleBalance > 0) {
            want.safeTransfer(msg.sender, idleBalance);
            remaining -= idleBalance;
        }

        for (uint256 i = 0; i < strategyList.length && remaining > 0; i++) {
            StrategyInfo storage info = strategies[strategyList[i]];
            if (info.active && info.allocation > 0) {
                uint256 strategyShare = (_amount * info.allocation) / 10000;
                uint256 toWithdraw = strategyShare < remaining ? strategyShare : remaining;

                if (toWithdraw > 0) {
                    try IStrategy(info.strategy).withdraw(toWithdraw) {
                        info.totalWithdrawn += toWithdraw;
                        remaining -= toWithdraw;
                        emit Withdrawn(info.strategy, toWithdraw);
                    } catch {
                        // Continue
                    }
                }
            }
        }

        uint256 finalBalance = want.balanceOf(address(this));
        if (finalBalance > 0) {
            want.safeTransfer(msg.sender, finalBalance);
        }
    }

    // ========== Harvest & Rebalance ==========

    function harvestAll() external nonReentrant {
        for (uint256 i = 0; i < strategyList.length; i++) {
            StrategyInfo storage info = strategies[strategyList[i]];
            if (info.active) {
                try IStrategy(info.strategy).harvest() returns (uint256 profit, uint256 loss) {
                    info.lastHarvest = block.timestamp;
                    emit Harvested(info.strategy, profit, loss);
                } catch {
                    // Continue
                }
            }
        }
    }

    function rebalance() external onlyOwner {
        uint256 totalBalance = totalAssets();

        for (uint256 i = 0; i < strategyList.length; i++) {
            StrategyInfo storage info = strategies[strategyList[i]];
            if (!info.active) continue;

            uint256 idealAmount = (totalBalance * info.allocation) / 10000;
            uint256 currentAmount = IStrategy(info.strategy).totalAssets();

            if (currentAmount > idealAmount) {
                uint256 excess = currentAmount - idealAmount;
                IStrategy(info.strategy).withdraw(excess);
            } else if (currentAmount < idealAmount) {
                uint256 deficit = idealAmount - currentAmount;
                uint256 available = want.balanceOf(address(this));
                if (available >= deficit) {
                    want.safeApprove(info.strategy, deficit);
                    IStrategy(info.strategy).deposit(deficit);
                }
            }
        }

        emit Rebalanced();
    }

    // ========== Strategy Management ==========

    function addStrategy(address _strategy, uint256 _allocation) external onlyOwner {
        require(!isStrategy[_strategy], "Already added");
        require(_allocation <= 10000, "Invalid allocation");

        IStrategy strategy = IStrategy(_strategy);

        strategyList.push(_strategy);
        strategies[_strategy] = StrategyInfo({
            strategy: _strategy,
            name: strategy.name(),
            allocation: _allocation,
            active: true,
            lastHarvest: 0,
            totalDeposited: 0,
            totalWithdrawn: 0
        });
        isStrategy[_strategy] = true;
        totalAllocation += _allocation;

        emit StrategyAdded(_strategy, strategy.name(), _allocation);
    }

    function removeStrategy(address _strategy) external onlyOwner validStrategy(_strategy) {
        StrategyInfo storage info = strategies[_strategy];

        if (IStrategy(_strategy).totalAssets() > 0) {
            IStrategy(_strategy).withdraw(IStrategy(_strategy).totalAssets());
        }

        totalAllocation -= info.allocation;
        info.active = false;
        isStrategy[_strategy] = false;

        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategyList[i] == _strategy) {
                strategyList[i] = strategyList[strategyList.length - 1];
                strategyList.pop();
                break;
            }
        }

        emit StrategyRemoved(_strategy);
    }

    function setAllocation(address _strategy, uint256 _allocation) external onlyOwner validStrategy(_strategy) {
        require(_allocation <= 10000, "Invalid allocation");

        StrategyInfo storage info = strategies[_strategy];
        totalAllocation = totalAllocation - info.allocation + _allocation;
        info.allocation = _allocation;

        emit AllocationUpdated(_strategy, _allocation);
    }

    function setStrategyActive(address _strategy, bool _active) external onlyOwner validStrategy(_strategy) {
        strategies[_strategy].active = _active;
    }

    // ========== Config ==========

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    // ========== Emergency ==========

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdrawAll(address _to) external onlyOwner {
        _pause();

        for (uint256 i = 0; i < strategyList.length; i++) {
            try IStrategy(strategyList[i]).emergencyWithdraw(address(this)) {} catch {}
        }

        uint256 balance = want.balanceOf(address(this));
        if (balance > 0) {
            want.safeTransfer(_to, balance);
        }
    }

    function sweep(address _token) external onlyOwner {
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner(), balance);
        }
    }
}
