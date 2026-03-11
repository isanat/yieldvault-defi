// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract YieldVaultV3 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdtAsset;

    string public name;
    string public symbol;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    address public config;
    address public referralSystem;
    address public localStrategyManager;
    address public feeDistributor;

    uint256 public depositFeeBP = 500;
    uint256 public performanceFeeBP = 2000;
    uint256 public managementFeeBP = 200;
    uint256 public withdrawalFeeBP = 0;

    uint256 private constant MAX_BPS = 10000;

    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);

    constructor(
        address _usdt,
        address _owner,
        string memory _name,
        string memory _symbol
    ) {
        usdtAsset = IERC20(_usdt);
        name = _name;
        symbol = _symbol;
        _transferOwnership(_owner);
    }

    function asset() external view returns (address) {
        return address(usdtAsset);
    }

    function totalAssets() public view returns (uint256) {
        return usdtAsset.balanceOf(address(this));
    }

    function convertToShares(uint256 assetsAmount) public view returns (uint256) {
        uint256 supply = totalSupply;
        if (supply == 0) return assetsAmount;
        return (assetsAmount * supply) / totalAssets();
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply;
        if (supply == 0) return shares;
        return (shares * totalAssets()) / supply;
    }

    function deposit(uint256 assetsAmount, address receiver) external nonReentrant whenNotPaused returns (uint256) {
        require(assetsAmount > 0, "Zero amount");

        uint256 shares = convertToShares(assetsAmount);
        require(shares > 0, "Zero shares");

        uint256 depositFee = (assetsAmount * depositFeeBP) / MAX_BPS;

        usdtAsset.safeTransferFrom(msg.sender, address(this), assetsAmount);

        if (depositFee > 0 && feeDistributor != address(0)) {
            usdtAsset.safeTransfer(feeDistributor, depositFee);
        }

        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assetsAmount, shares);

        return shares;
    }

    function withdraw(uint256 shares, address receiver, address ownerAddr) external nonReentrant returns (uint256) {
        require(shares > 0, "Zero shares");
        require(balanceOf[ownerAddr] >= shares, "Insufficient balance");

        if (msg.sender != ownerAddr) {
            revert("Not authorized");
        }

        uint256 assetsToReturn = convertToAssets(shares);
        uint256 withdrawalFee = (assetsToReturn * withdrawalFeeBP) / MAX_BPS;
        uint256 assetsAfterFee = assetsToReturn - withdrawalFee;

        _burn(ownerAddr, shares);

        if (withdrawalFee > 0 && feeDistributor != address(0)) {
            usdtAsset.safeTransfer(feeDistributor, withdrawalFee);
        }

        usdtAsset.safeTransfer(receiver, assetsAfterFee);

        emit Withdraw(msg.sender, receiver, ownerAddr, assetsAfterFee, shares);

        return assetsAfterFee;
    }

    function _mint(address to, uint256 amount) internal {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function _burn(address from, uint256 amount) internal {
        balanceOf[from] -= amount;
        totalSupply -= amount;
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
    }

    function setConfig(address _config) external onlyOwner {
        config = _config;
    }

    function setReferralSystem(address _referralSystem) external onlyOwner {
        referralSystem = _referralSystem;
    }

    function setLocalStrategyManager(address _manager) external onlyOwner {
        localStrategyManager = _manager;
    }

    function setFeeDistributor(address _feeDistributor) external onlyOwner {
        feeDistributor = _feeDistributor;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        usdtAsset.safeTransfer(owner(), amount);
    }
}
