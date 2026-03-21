// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.23;

/// @dev A contract with no payable receive/fallback — ETH transfers to it will fail with 2300 gas
contract RejectETH {
    // no receive, no fallback, not payable
}

/// @dev Mimics USDT-style ERC-20 that does NOT return a bool from transferFrom
contract NonStandardToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor() {
        balanceOf[msg.sender] = 1_000_000 * 1e6; // 1M tokens, 6 decimals
    }

    function approve(address spender, uint256 amount) external {
        allowance[msg.sender][spender] = amount;
    }

    /// @dev No return value — USDT style
    function transferFrom(address from, address to, uint256 amount) external {
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        require(balanceOf[from] >= amount, "insufficient balance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        // intentionally no return value
    }
}

/// @dev A contract with a receive() that burns more than 2300 gas — triggers the 2300-gas limit
contract GreedyReceiver {
    uint256 public count;

    receive() external payable {
        // burns well over 2300 gas via SSTORE operations
        for (uint256 i = 0; i < 10; i++) {
            count += 1;
        }
    }
}
