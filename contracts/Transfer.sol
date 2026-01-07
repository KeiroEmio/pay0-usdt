// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Transfer is Ownable {
    IERC20 public usd;
    address public safeAddress;

    constructor(
        address _usdtAddress,
        address _safeAddress
    ) Ownable(msg.sender) {
        require(_usdtAddress != address(0), "Invalid USDT address");
        require(_safeAddress != address(0), "Invalid safe address");

        usd = IERC20(_usdtAddress);
        safeAddress = _safeAddress;
    }

    event TransferUSD(address indexed from, uint256 amount);

    function transferUSD(uint256 amount) external {
        require(
            usd.transferFrom(msg.sender, safeAddress, amount),
            "USD transfer failed"
        );
        emit TransferUSD(msg.sender, amount);
    }

    function setSafeAddress(address newSafeAddress) external onlyOwner {
        safeAddress = newSafeAddress;
    }

    function setUSD(address usdAddress) external onlyOwner {
        usd = IERC20(usdAddress);
    }

    function setOwner(address newOwner) external onlyOwner {
        transferOwnership(newOwner);
    }

    function balanceOfUSD() external view returns (uint256) {
        return usd.balanceOf(address(this));
    }
}
