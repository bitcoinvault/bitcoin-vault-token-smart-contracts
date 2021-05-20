pragma solidity ^0.8.0;

import "./WBTCV.sol";

struct PendingMint{
    address addr;
    uint256 amount;
    address addressSigned;
}

struct PendingBurn{
    uint256 amount;
    address addressSigned;
}

struct PendingOwnershipChange{
    address newOwner;
    address addressSigned;
}

contract WbtcvController {
    WBTCV private _ownedContract;
    mapping(address => bool) private _signers;
    PendingMint[] public pendingMints;
    PendingBurn[] public pendingBurns;
    PendingOwnershipChange[] public  pendingOwnershipChanges;

    modifier onlySigner() {
        require(_signers[msg.sender], "Feature is only available for approved signers");
        _;
    }

    constructor(WBTCV ownedContract, address[] memory signers){
        require(3 == signers.length, "There should be 3 signers");
        for(uint i = 0; i < 3; i++)
            _signers[signers[i]] = true;
        _ownedContract = ownedContract;
    }

    function mint(address addr, uint256 amount) external onlySigner{
        pendingMints.push(PendingMint(addr, amount, msg.sender));
    }

    function getMintsCount() external view returns (uint){
        return pendingMints.length;
    }

    function getBurnsCount() external view returns (uint){
        return pendingBurns.length;
    }

    function _isMintSignatureCorrect(address addr, uint256 amount) private view returns (bool){
        for(uint i = 0; i < pendingMints.length; i++){
            if(addr == pendingMints[i].addr && amount == pendingMints[i].amount && msg.sender != pendingMints[i].addressSigned){
                return true;
            }
        }
        return false;
    }

    function signMint(address addr, uint256 amount) external onlySigner{
        if(_isMintSignatureCorrect(addr, amount)){
            delete pendingMints;
            _ownedContract.mint(addr, amount);
        }
        else revert("Mint proposal not present");
    }

    function burn(uint256 amount) external onlySigner{
        require(_ownedContract.balanceOf(address(this)) >= amount, "Not enough funds to burn!");
        pendingBurns.push(PendingBurn(amount, msg.sender));
    }

    function _isBurnSignatureCorrect(uint256 amount) private view returns(bool){
        for(uint i = 0; i < pendingBurns.length; i++){
            if(amount == pendingBurns[i].amount && msg.sender != pendingBurns[i].addressSigned){
                return true;
            }
        }
        return false;
    }

    function signBurn(uint256 amount) external onlySigner{
        require(_ownedContract.balanceOf(address(this)) >= amount, "Not enough funds to burn!");
        if(_isBurnSignatureCorrect(amount)){
            delete pendingBurns;
            _ownedContract.burn(amount);
        }
        else revert("Burn proposal not present");
    }

    function blockUser(address userAddress) external onlySigner{
        _ownedContract.blockUser(userAddress);
    }

    function unblockUser(address userAddress) external onlySigner{
        _ownedContract.unblockUser(userAddress);
    }

    function transferOwnership(address newOwner) external onlySigner{
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        pendingOwnershipChanges.push(PendingOwnershipChange(newOwner, msg.sender));
    }

    function _isOwnershipTransferSignatureCorrect(address newOwner) private view returns (bool){
        for(uint i = 0; i < pendingOwnershipChanges.length; i++){
            if(newOwner == pendingOwnershipChanges[i].newOwner){
                return true;
            }
        }
        return false;
    }

    function signTransferOwnership(address newOwner) external onlySigner{
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        if(_isOwnershipTransferSignatureCorrect(newOwner)){
            delete pendingOwnershipChanges;
            _ownedContract.transferOwnership(newOwner);
        }
        else revert("Ownership transfer proposal not present");
    }
}
