// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IStrategy.sol";

/**
 * @title BaseStrategy
 * @notice Contrato base para todas as estrategias do YieldVault
 */
abstract contract BaseStrategy is IStrategy, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ========== State ==========
    string public override name;
    address public vault;
    IERC20 public immutable wantToken;
    address public strategyController;

    uint256 public totalDebt;
    uint256 public lastReportTime;

    // ========== Events ==========
    event Deposited(address indexed caller, uint256 amount);
    event Withdrawn(address indexed caller, uint256 amount);

    // ========== Modifiers ==========
    modifier onlyVaultOrController() {
        require(msg.sender == vault || msg.sender == strategyController, "Only vault/controller");
        _;
    }

    // ========== Constructor ==========
    constructor(
        string memory _name,
        address _vault,
        address _want,
        address _owner
    ) Ownable() {
        name = _name;
        vault = _vault;
        wantToken = IERC20(_want);
        lastReportTime = block.timestamp;
        _transferOwnership(_owner);
    }

    // ========== View Functions ==========

    function want() external view virtual returns (address) {
        return address(wantToken);
    }

    function totalAssets() public view virtual returns (uint256) {
        return wantToken.balanceOf(address(this)) + balanceOfPool();
    }

    function balanceOfPool() public view virtual returns (uint256) {
        return 0;
    }

    function estimatedTotalAssets() external view virtual returns (uint256) {
        return totalAssets();
    }

    function estimatedAPY() external view virtual returns (uint256) {
        return 0;
    }

    function isActive() external view virtual returns (bool) {
        return !paused();
    }

    // ========== Core Functions ==========

    function deposit(uint256 _amount) external virtual override onlyVaultOrController whenNotPaused {
        require(_amount > 0, "Zero amount");

        wantToken.safeTransferFrom(msg.sender, address(this), _amount);
        totalDebt += _amount;

        _invest(_amount);

        emit Deposited(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external virtual override onlyVaultOrController nonReentrant {
        require(_amount > 0, "Zero amount");
        require(totalAssets() >= _amount, "Insufficient balance");

        uint256 balanceBefore = wantToken.balanceOf(address(this));

        if (balanceBefore < _amount) {
            _divest(_amount - balanceBefore);
        }

        uint256 balanceAfter = wantToken.balanceOf(address(this));
        uint256 toWithdraw = balanceAfter < _amount ? balanceAfter : _amount;

        wantToken.safeTransfer(msg.sender, toWithdraw);
        totalDebt -= toWithdraw;

        emit Withdrawn(msg.sender, toWithdraw);
    }

    function _invest(uint256 _amount) internal virtual;
    function _divest(uint256 _amount) internal virtual;

    // ========== Harvest ==========

    function harvest() external virtual override nonReentrant returns (uint256 profit, uint256 loss) {
        uint256 totalAssetsNow = totalAssets();

        if (totalAssetsNow > totalDebt) {
            profit = totalAssetsNow - totalDebt;
        } else if (totalAssetsNow < totalDebt) {
            loss = totalDebt - totalAssetsNow;
        }

        lastReportTime = block.timestamp;
        emit Harvested(profit, loss);
    }

    function rebalance() external virtual override {
        // Override em estrategias especificas
    }

    function setRiskParams(bytes calldata) external virtual override onlyOwner {
        // Override em estrategias especificas
    }

    // ========== Emergency Functions ==========

    function pause() external virtual override onlyOwner {
        _pause();
    }

    function unpause() external virtual override onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address _to) external virtual override onlyOwner {
        _pause();

        _divest(balanceOfPool());

        uint256 balance = wantToken.balanceOf(address(this));
        if (balance > 0) {
            wantToken.safeTransfer(_to, balance);
        }
    }

    // ========== Admin ==========

    function setController(address _controller) external onlyOwner {
        strategyController = _controller;
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    function sweep(address _token) external virtual onlyOwner {
        require(_token != address(wantToken), "Cannot sweep want");
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner(), balance);
        }
    }
}
