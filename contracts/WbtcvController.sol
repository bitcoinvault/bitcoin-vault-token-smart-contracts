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

contract WbtcvController {
    WBTCV private _ownedContract;
    mapping(address => bool) private _signers;
    PendingMint[] public pendingMints;
    PendingBurn[] public pendingBurns;

    modifier onlySigner() {
        require(_signers[msg.sender] == true, "Minting is only available for approved signers");
        _;
    }

    constructor(WBTCV ownedContract, address[] memory signers){
        require(3 == signers.length, "There should be 3 signers");
        for(uint i = 0; i < 3; i++)
            _signers[signers[i]] = true;
        _ownedContract = ownedContract;
    }

    function mint(address addr, uint256 amount) public onlySigner{
        pendingMints.push(PendingMint(addr, amount, msg.sender));
    }

    function getMintsCount() public view returns (uint){
        return pendingMints.length;
    }

    function getBurnsCount() public view returns (uint){
        return pendingBurns.length;
    }

    function signMint(address addr, uint256 amount) public onlySigner{
        for(uint i = 0; i < pendingMints.length; i++){
            if(addr == pendingMints[i].addr && amount == pendingMints[i].amount && msg.sender != pendingMints[i].addressSigned){
                _ownedContract.mint(addr, amount);
                delete pendingMints;
                return;
            }
        }
        revert("Mint proposal not present");
    }

    function burn(uint256 amount) public{
        require(_ownedContract.balanceOf(address(this)) >= amount, "Not enough funds to burn!");
        pendingBurns.push(PendingBurn(amount, msg.sender));
    }

    function signBurn(uint256 amount) public onlySigner{
        require(_ownedContract.balanceOf(address(this)) >= amount, "Not enough funds to burn!");
        for(uint i = 0; i < pendingBurns.length; i++){
            if(amount == pendingBurns[i].amount && msg.sender != pendingBurns[i].addressSigned){
                _ownedContract.burn(amount);
                delete pendingBurns;
                return;
            }
        }
        revert("Burn proposal not present");
    }

    function blockUser(address userAddress) public{
        _ownedContract.blockUser(userAddress);
    }

    function unblockUser(address userAddress) public{
        _ownedContract.unblockUser(userAddress);
    }
}
