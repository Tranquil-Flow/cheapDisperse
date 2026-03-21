// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.23;

// Gas optimizations applied:
//   1. unchecked loop increments  — overflow impossible (length <= MAX_RECIPIENTS = 1000)
//   2. TRANSFER_FROM_SELECTOR     — pre-computed constant instead of runtime keccak256
//   3. msg.sender cached locally  — avoids repeated opcode reads inside disperseToken loop
//   4. ++i instead of i++         — saves a temporary in the increment
//   5. Excess ETH refund          — unspent / failed-transfer ETH returned to sender
//   6. NatSpec on MAX_RECIPIENTS  — documents the limit

contract CheapDisperse {
    error EtherTransferFailed();
    error TokenTransferFailed();
    error ArrayLengthMismatch();
    error ArrayLengthOverMaxLimit();

    /// @notice Maximum number of recipients allowed per disperse call.
    uint256 private constant MAX_RECIPIENTS = 1000;

    /// @dev bytes4(keccak256("transferFrom(address,address,uint256)")) — pre-computed to avoid
    ///      a runtime keccak256 on every disperseToken call.
    bytes4 private constant TRANSFER_FROM_SELECTOR = 0x23b872dd;

    /// @notice Sends ether to an array of users
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

        return failed;
    }

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

        for (uint i = 0; i < length;) {
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSelector(TRANSFER_FROM_SELECTOR, sender, recipients[i], values[i])
            );
            // Non-standard tokens (USDT-style) return no data — treat empty return as success
            // Standard tokens return a bool — decode and check it
            if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) {
                revert TokenTransferFailed();
            }
            unchecked { ++i; }
        }
    }
}
