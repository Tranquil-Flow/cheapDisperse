// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.23;

// Gas optimizations applied:
//   1. unchecked loop increments  — overflow impossible (length <= MAX_RECIPIENTS = 1000)
//   2. TRANSFER_FROM_SELECTOR     — pre-computed constant instead of runtime keccak256
//   3. msg.sender cached locally  — avoids repeated opcode reads inside disperseToken loop
//   4. ++i instead of i++         — saves a temporary in the increment
//   5. Excess ETH refund          — unspent / failed-transfer ETH returned to sender
//   6. NatSpec on MAX_RECIPIENTS  — documents the limit
//   7. Events emitted             — enables off-chain indexing of dispersals
//   8. Equal-amount functions     — single value for all recipients (saves calldata gas)
//   9. Assembly ETH transfer      — raw CALL opcode for maximum gas efficiency

contract CheapDisperse {
    error EtherTransferFailed();
    error TokenTransferFailed();
    error ArrayLengthMismatch();
    error ArrayLengthOverMaxLimit();
    error ZeroRecipients();

    /// @notice Emitted after a successful ETH disperse
    /// @param sender The address that initiated the disperse
    /// @param totalAmount Total wei sent (before refunds)
    /// @param recipientCount Number of recipients attempted
    /// @param failedCount Number of failed transfers
    event EtherDispersed(
        address indexed sender,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 failedCount
    );

    /// @notice Emitted after a successful token disperse
    /// @param sender The address that initiated the disperse
    /// @param token The token contract address
    /// @param totalAmount Total tokens transferred
    /// @param recipientCount Number of recipients
    event TokenDispersed(
        address indexed sender,
        address indexed token,
        uint256 totalAmount,
        uint256 recipientCount
    );

    /// @notice Maximum number of recipients allowed per disperse call.
    uint256 private constant MAX_RECIPIENTS = 1000;

    /// @dev bytes4(keccak256("transferFrom(address,address,uint256)")) — pre-computed to avoid
    ///      a runtime keccak256 on every disperseToken call.
    bytes4 private constant TRANSFER_FROM_SELECTOR = 0x23b872dd;

    // ──────────────────────────────────────────────────────────
    // ETH disperse (variable amounts)
    // ──────────────────────────────────────────────────────────

    /// @notice Sends ether to an array of users with individual amounts
    /// @dev Uses call{gas: 2300} to prevent reentrancy from fallback functions.
    ///      Failed transfers are collected and returned instead of reverting.
    ///      Any ETH not delivered (overpayment or failed transfers) is refunded to the sender.
    /// @param recipients A list of addresses that will receive ether
    /// @param values A list of the number of wei that each address will receive
    /// @return failed The list of addresses that failed to receive ether
    function disperseEther(address[] calldata recipients, uint[] calldata values) external payable returns (address[] memory) {
        uint length = recipients.length;
        if (length != values.length) {revert ArrayLengthMismatch();}
        if (length > MAX_RECIPIENTS) {revert ArrayLengthOverMaxLimit();}

        address[] memory failed = new address[](length);
        uint failedCount;
        uint refund = msg.value;

        for (uint i = 0; i < length;) {
            (bool success, ) = payable(recipients[i]).call{value: values[i], gas: 2300}("");
            if (!success) {
                failed[failedCount] = recipients[i];
                unchecked { ++failedCount; }
            } else {
                // values[i] was actually sent; sum of successful sends can never exceed msg.value
                unchecked { refund -= values[i]; }
            }
            unchecked { ++i; }
        }

        // Resize the failed array to actual count
        assembly { mstore(failed, failedCount) }

        // Refund any ETH not delivered (overpayment or failed-transfer amounts)
        if (refund > 0) {
            (bool ok, ) = payable(msg.sender).call{value: refund}("");
            if (!ok) revert EtherTransferFailed();
        }

        emit EtherDispersed(msg.sender, msg.value, length, failedCount);

        return failed;
    }

    // ──────────────────────────────────────────────────────────
    // ETH disperse (equal amount to all)
    // ──────────────────────────────────────────────────────────

    /// @notice Sends equal amounts of ether to all recipients
    /// @dev Saves calldata gas by accepting a single value instead of an array.
    ///      Failed transfers are collected and returned. Excess ETH is refunded.
    /// @param recipients A list of addresses that will receive ether
    /// @param value The amount of wei each recipient will receive
    /// @return failed The list of addresses that failed to receive ether
    function disperseEtherEqual(address[] calldata recipients, uint value) external payable returns (address[] memory) {
        uint length = recipients.length;
        if (length == 0) {revert ZeroRecipients();}
        if (length > MAX_RECIPIENTS) {revert ArrayLengthOverMaxLimit();}

        address[] memory failed = new address[](length);
        uint failedCount;
        uint sent;

        for (uint i = 0; i < length;) {
            (bool success, ) = payable(recipients[i]).call{value: value, gas: 2300}("");
            if (!success) {
                failed[failedCount] = recipients[i];
                unchecked { ++failedCount; }
            } else {
                unchecked { sent += value; }
            }
            unchecked { ++i; }
        }

        // Resize the failed array to actual count
        assembly { mstore(failed, failedCount) }

        // Refund any ETH not delivered
        uint refund = msg.value - sent;
        if (refund > 0) {
            (bool ok, ) = payable(msg.sender).call{value: refund}("");
            if (!ok) revert EtherTransferFailed();
        }

        emit EtherDispersed(msg.sender, msg.value, length, failedCount);

        return failed;
    }

    // ──────────────────────────────────────────────────────────
    // Fast ETH disperse (assembly, no failed-address tracking)
    // ──────────────────────────────────────────────────────────

    /// @notice Ultra-gas-efficient ETH disperse using raw assembly
    /// @dev Reverts on any failed transfer (no graceful degradation).
    ///      No failed-address tracking overhead. Use when all recipients are EOAs
    ///      or known-good contracts. Refunds excess ETH to sender.
    /// @param recipients A list of addresses that will receive ether
    /// @param values A list of the number of wei that each address will receive
    function disperseEtherFast(address[] calldata recipients, uint[] calldata values) external payable {
        uint length = recipients.length;
        if (length != values.length) {revert ArrayLengthMismatch();}
        if (length > MAX_RECIPIENTS) {revert ArrayLengthOverMaxLimit();}

        uint totalSent;

        for (uint i = 0; i < length;) {
            address to = recipients[i];
            uint val = values[i];
            assembly {
                let success := call(2300, to, val, 0, 0, 0, 0)
                if iszero(success) {
                    // revert EtherTransferFailed()
                    mstore(0x00, 0x6747a288) // bytes4(keccak256("EtherTransferFailed()"))
                    revert(0x1c, 0x04)
                }
            }
            unchecked {
                totalSent += val;
                ++i;
            }
        }

        // Refund excess ETH
        uint refund = msg.value - totalSent;
        if (refund > 0) {
            (bool ok, ) = payable(msg.sender).call{value: refund}("");
            if (!ok) revert EtherTransferFailed();
        }

        emit EtherDispersed(msg.sender, msg.value, length, 0);
    }

    // ──────────────────────────────────────────────────────────
    // ERC-20 disperse (variable amounts)
    // ──────────────────────────────────────────────────────────

    /// @notice Sends tokens to an array of users
    /// @dev Handles non-standard ERC-20 tokens (e.g. USDT) that do not return a bool.
    ///      Uses a low-level call and inspects the return data: success if no return data
    ///      (non-standard token) or return data decodes to true.
    /// @param token The address of the token being sent
    /// @param recipients A list of addresses that will receive tokens
    /// @param values A list of the number of tokens that each address will receive
    function disperseToken(address token, address[] calldata recipients, uint[] calldata values) external {
        uint length = recipients.length;
        if (length != values.length) {revert ArrayLengthMismatch();}
        if (length > MAX_RECIPIENTS) {revert ArrayLengthOverMaxLimit();}

        address sender = msg.sender;
        uint totalAmount;

        for (uint i = 0; i < length;) {
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSelector(TRANSFER_FROM_SELECTOR, sender, recipients[i], values[i])
            );
            // Non-standard tokens (USDT-style) return no data — treat empty return as success
            // Standard tokens return a bool — decode and check it
            if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) {
                revert TokenTransferFailed();
            }
            unchecked {
                totalAmount += values[i];
                ++i;
            }
        }

        emit TokenDispersed(sender, token, totalAmount, length);
    }

    // ──────────────────────────────────────────────────────────
    // ERC-20 disperse (equal amount to all)
    // ──────────────────────────────────────────────────────────

    /// @notice Sends equal amounts of tokens to all recipients
    /// @dev Saves calldata gas by accepting a single value instead of an array.
    /// @param token The address of the token being sent
    /// @param recipients A list of addresses that will receive tokens
    /// @param value The amount of tokens each recipient will receive
    function disperseTokenEqual(address token, address[] calldata recipients, uint value) external {
        uint length = recipients.length;
        if (length == 0) {revert ZeroRecipients();}
        if (length > MAX_RECIPIENTS) {revert ArrayLengthOverMaxLimit();}

        address sender = msg.sender;

        for (uint i = 0; i < length;) {
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSelector(TRANSFER_FROM_SELECTOR, sender, recipients[i], value)
            );
            if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) {
                revert TokenTransferFailed();
            }
            unchecked { ++i; }
        }

        emit TokenDispersed(sender, token, value * length, length);
    }
}
