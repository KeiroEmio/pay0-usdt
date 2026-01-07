// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev 模拟真实 USDT 的 ERC20 代币，用于本地测试
 * 关键点：
 * - decimals = 6
 * - 名称和符号与真实 USDT 一致
 * - 部署后 owner 可 mint 更多（方便测试）
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20("Tether USD", "USDT") Ownable(msg.sender) {
        _decimals = 6;

        uint256 initialSupply = 100_000_000 * 10 ** decimals();
        _mint(msg.sender, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external onlyOwner {
        _burn(msg.sender, amount);
    }
}
