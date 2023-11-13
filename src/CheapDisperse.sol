pragma solidity 0.8.23;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract CheapDisperse {
    error EtherTransferFailed();
    error TokenTransferFailed();
    error ArrayLengthMismatch();
    error MaxAddressesPerCallLimit();

    /// @dev Function send ether to an array of users
    /// @param recipients A list of addresses that will receive ether
    /// @param values A list of the number of wei that each address will receive
    function disperseEther(address[] calldata recipients, uint[] calldata values) external payable {
        uint length = recipients.length;
        if (length != values.length) {revert ArrayLengthMismatch();}
        
        for (uint i = 0; i < length; i++) {
            (bool success, ) = recipients[i].call{value: values[i]}("");
            if (!success) {revert EtherTransferFailed();}
        }
    }

    /// @dev Function to send tokens to an array of users
    /// @param token The address of the token being sent
    /// @param recipients A list of addresses that will receive tokens
    /// @param values A list of the number of tokens that each address will receive
    function disperseToken(IERC20 token, address[] calldata recipients, uint[] calldata values) external {
        uint length = recipients.length;
        if (length != values.length) {revert ArrayLengthMismatch();}
        if (length > 1000) {revert MaxAddressesPerCallLimit();}

        for (uint i = 0; i < length; i++) {
            bool success = token.transferFrom(msg.sender, recipients[i], values[i]);
            if (!success) {revert TokenTransferFailed();}
        }
    }

}