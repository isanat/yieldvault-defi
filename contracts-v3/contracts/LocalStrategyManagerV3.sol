// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IReferralV3 {
    function getReferrer(address user) external view returns (address);
    function distributeRewards(address user, uint256 amount) external returns (address[] memory, uint256[] memory);
    function isRegistered(address user) external view returns (bool);
}

interface IFeeDistributorV3 {
    function distributeFees(address token, uint256 amount) external;
}

contract LocalStrategyManagerV3 is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    IReferralV3 public referral;
    IFeeDistributorV3 public feeDistributor;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public totalRewardsDistributed;

    uint256 public depositFeeBP = 500;    // 5%
    uint256 public performanceFeeBP = 1000; // 10%
    uint256 public constant MAX_BPS = 10000;

    uint256 public constant INTEREST_RATE_BPS = 100; // 1% per day (simulated)
    uint256 public constant COMPOUND_INTERVAL = 1 days;

    struct UserInfo {
        uint256 deposited;
        uint256 withdrawn;
        uint256 lastDepositTime;
        uint256 pendingRewards;
    }

    mapping(address => UserInfo) public userInfo;

    event Deposited(address indexed user, uint256 amount, uint256 fee);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _usdt, address _owner, address _referral, address _feeDistributor) {
        _transferOwnership(_owner);
        usdt = IERC20(_usdt);
        referral = IReferralV3(_referral);
        feeDistributor = IFeeDistributorV3(_feeDistributor);
    }

    function deposit(uint256 _amount) external {
        require(_amount > 0, "Zero amount");

        _accrueRewards(msg.sender);

        uint256 fee = (_amount * depositFeeBP) / MAX_BPS;
        uint256 amountAfterFee = _amount - fee;

        usdt.safeTransferFrom(msg.sender, address(this), _amount);

        if (fee > 0 && address(feeDistributor) != address(0)) {
            usdt.safeApprove(address(feeDistributor), fee);
            feeDistributor.distributeFees(address(usdt), fee);
        }

        UserInfo storage user = userInfo[msg.sender];
        user.deposited += amountAfterFee;
        user.lastDepositTime = block.timestamp;

        totalDeposited += amountAfterFee;

        _distributeReferralRewards(msg.sender, amountAfterFee);

        emit Deposited(msg.sender, _amount, fee);
    }

    function withdraw(uint256 _amount) external {
        require(_amount > 0, "Zero amount");

        UserInfo storage user = userInfo[msg.sender];
        require(user.deposited >= _amount, "Insufficient balance");

        _accrueRewards(msg.sender);

        user.deposited -= _amount;
        user.lastDepositTime = block.timestamp;
        totalWithdrawn += _amount;

        usdt.safeTransfer(msg.sender, _amount);

        emit Withdrawn(msg.sender, _amount);
    }

    function claimRewards() external {
        _accrueRewards(msg.sender);

        UserInfo storage user = userInfo[msg.sender];
        uint256 rewards = user.pendingRewards;

        require(rewards > 0, "No rewards");

        user.pendingRewards = 0;
        totalRewardsDistributed += rewards;

        usdt.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    function _accrueRewards(address _user) internal {
        UserInfo storage user = userInfo[_user];

        if (user.deposited > 0 && user.lastDepositTime > 0) {
            uint256 timeElapsed = block.timestamp - user.lastDepositTime;
            if (timeElapsed >= COMPOUND_INTERVAL) {
                uint256 intervals = timeElapsed / COMPOUND_INTERVAL;
                uint256 rewards = (user.deposited * INTEREST_RATE_BPS * intervals) / MAX_BPS;

                uint256 performanceFee = (rewards * performanceFeeBP) / MAX_BPS;
                uint256 netRewards = rewards - performanceFee;

                user.pendingRewards += netRewards;
                user.lastDepositTime = block.timestamp;

                if (performanceFee > 0 && address(feeDistributor) != address(0)) {
                    usdt.safeApprove(address(feeDistributor), performanceFee);
                    feeDistributor.distributeFees(address(usdt), performanceFee);
                }
            }
        }
    }

    function _distributeReferralRewards(address _user, uint256 _amount) internal {
        if (address(referral) != address(0)) {
            try referral.getReferrer(_user) returns (address referrer) {
                if (referrer != address(0)) {
                    referral.distributeRewards(_user, _amount);
                }
            } catch {}
        }
    }

    function getUserInfo(address _user) external view returns (
        uint256 deposited,
        uint256 withdrawn,
        uint256 pendingRewards,
        uint256 totalValue
    ) {
        UserInfo storage user = userInfo[_user];
        deposited = user.deposited;
        withdrawn = user.withdrawn;
        pendingRewards = user.pendingRewards;
        totalValue = user.deposited + user.pendingRewards;
    }

    function setDepositFeeBP(uint256 _feeBP) external onlyOwner {
        require(_feeBP <= 1000, "Fee max 10%");
        depositFeeBP = _feeBP;
    }

    function setPerformanceFeeBP(uint256 _feeBP) external onlyOwner {
        require(_feeBP <= 2000, "Fee max 20%");
        performanceFeeBP = _feeBP;
    }

    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        usdt.safeTransfer(owner(), _amount);
    }

    function sweep() external onlyOwner {
        uint256 balance = usdt.balanceOf(address(this));
        if (balance > 0) {
            usdt.safeTransfer(owner(), balance);
        }
    }
}
