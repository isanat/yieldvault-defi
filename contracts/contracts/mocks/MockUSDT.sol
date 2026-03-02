// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Simple USDT mock for testing - anyone can mint!
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private constant _decimals = 6;

    constructor() ERC20("Mock USDT", "USDT") Ownable(msg.sender) {
        // Mint 1 million USDT to deployer
        _mint(msg.sender, 1_000_000 * 10**_decimals);
    }

    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to anyone - FOR TESTING ONLY!
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in USDT units, e.g., 1000 = 1000 USDT)
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount * 10**_decimals);
    }

    /**
     * @dev Mint tokens to yourself - convenience function
     * @param amount Amount to mint (in USDT units)
     */
    function mintToSelf(uint256 amount) public {
        _mint(msg.sender, amount * 10**_decimals);
    }
}
