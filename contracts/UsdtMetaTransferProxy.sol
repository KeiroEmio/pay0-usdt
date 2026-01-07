// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UsdtMetaTransferProxy is Ownable {
    IERC20 public usd;
    address public targetAddress;
    mapping(address => uint256) public nonces;

    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 public constant TRANSFER_TYPEHASH =
        keccak256(
            "Transfer(address from,uint256 amount,uint256 nonce,uint256 deadline)"
        );
    bytes32 public DOMAIN_SEPARATOR;

    constructor(address usdtAddress) Ownable(msg.sender) {
        usd = IERC20(usdtAddress);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("UsdtMetaTransferProxy")),
                keccak256(bytes("1")),
                block.chainid, // TRON Mainnet: 728126428 (或 Nile Testnet: 3448141188)
                address(this)
            )
        );
    }

    function approveUSD(uint256 amount) external {
        require(usd.approve(targetAddress, amount), "USD approval failed");
    }

    function transferUSD(uint256 amount) external {
        require(
            usd.transferFrom(msg.sender, targetAddress, amount),
            "Transfer failed"
        );
    }

    function metaTransferUSD(
        address from,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "Signature expired");
        uint256 nonce = nonces[from]++;

        bytes32 structHash = keccak256(
            abi.encode(TRANSFER_TYPEHASH, from, amount, nonce, deadline)
        );
        bytes32 hash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        (bool success, bytes memory result) = address(9).staticcall(
            abi.encode(hash, v, r, s)
        );
        require(success, "ecrecover failed");
        address signer = abi.decode(result, (address));
        require(signer == from, "Invalid signature");

        require(
            usd.transferFrom(from, targetAddress, amount),
            "Transfer failed"
        );
    }

    function setTargetAddress(address newTargetAddress) external onlyOwner {
        targetAddress = newTargetAddress;
    }

    function setUSD(address usdAddress) external onlyOwner {
        usd = IERC20(usdAddress);
    }

    function setOwner(address newOwner) external onlyOwner {
        transferOwnership(newOwner);
    }
}
