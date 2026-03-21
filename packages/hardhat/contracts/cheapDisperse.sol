// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.23;

contract CheapDisperse {
    error EtherTransferFailed();
    error TokenTransferFailed();
    error ArrayLengthMismatch();
    error ArrayLengthOverMaxLimit();

    uint256 private constant MAX_RECIPIENTS = 1000;

    /// @notice Sends ether to an array of users
    /// @dev Uses call{gas: 2300} to prevent reentrancy from fallback functions.
    ///      Failed transfers are collected and returned instead of reverting.
    /// @param recipients A list of addresses that will receive ether
    /// @param values A list of the number of wei that each address will receive
    /// @return failed The list of addresses that failed to receive ether
    function disperseEther(address[] calldata recipients, uint[] calldata values) external payable returns (address[] memory) {
        uint length = recipients.length;
        if (length != values.length) {revert ArrayLengthMismatch();}
        if (length > MAX_RECIPIENTS) {revert ArrayLengthOverMaxLimit();}

        address[] memory failed = new address[](length);
        uint failedCount;

        for (uint i = 0; i < length; i++) {
            (bool success, ) = payable(recipients[i]).call{value: values[i], gas: 2300}("");
            if (!success) {
                failed[failedCount] = recipients[i];
                failedCount++;
            }
        }

        // Resize the failed array to actual count
        assembly { mstore(failed, failedCount) }

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

        bytes4 selector = bytes4(keccak256("transferFrom(address,address,uint256)"));

        for (uint i = 0; i < length; i++) {
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSelector(selector, msg.sender, recipients[i], values[i])
            );
            // Non-standard tokens (USDT-style) return no data — treat empty return as success
            // Standard tokens return a bool — decode and check it
            if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) {
                revert TokenTransferFailed();
            }
        }
    }
}
