// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FeeDistributorV3 is Ownable {
    using SafeERC20 for IERC20;

    address public treasury;
    uint256 public treasuryShareBP = 8000; // 80%

    event FeesDistributed(address indexed token, uint256 amount, uint256 treasuryAmount);
    event TreasuryUpdated(address indexed newTreasury);
    event TreasuryShareUpdated(uint256 newShare);

    constructor(address _owner, address _treasury) {
        _transferOwnership(_owner);
        treasury = _treasury;
    }

    function distributeFees(address _token, uint256 _amount) external {
        IERC20 token = IERC20(_token);
        require(token.balanceOf(address(this)) >= _amount, "Insufficient balance");

        uint256 treasuryAmount = (_amount * treasuryShareBP) / 10000;
        uint256 remaining = _amount - treasuryAmount;

        if (treasuryAmount > 0 && treasury != address(0)) {
            token.safeTransfer(treasury, treasuryAmount);
        }

        if (remaining > 0) {
            token.safeTransfer(owner(), remaining);
        }

        emit FeesDistributed(_token, _amount, treasuryAmount);
    }

    function withdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }

    function withdrawAll(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(_token).safeTransfer(owner(), balance);
        }
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setTreasuryShareBP(uint256 _shareBP) external onlyOwner {
        require(_shareBP <= 10000, "Share exceeds 100%");
        treasuryShareBP = _shareBP;
        emit TreasuryShareUpdated(_shareBP);
    }
}
