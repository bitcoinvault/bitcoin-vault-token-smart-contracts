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

    function removeFromPendingMints(uint i) private{
        require(i < pendingMints.length);
        if(pendingMints.length == 1)
            delete pendingMints;
        else{
            pendingMints[i] = pendingMints[pendingMints.length - 1];
            pendingMints.pop();
        }
    }

    function signMint(address addr, uint256 amount) public{
        for(uint i = 0; i < pendingMints.length; i++){
            if(addr == pendingMints[i].addr && amount == pendingMints[i].amount && msg.sender != pendingMints[i].addressSigned){
                _ownedContract.mint(addr, amount);
                removeFromPendingMints(i);
                break;
            }
        }
    }

    function burn(uint256 amount) public{
        _ownedContract.burn(amount);
    }

    function blockUser(address userAddress) public{
        _ownedContract.blockUser(userAddress);
    }

    function unblockUser(address userAddress) public{
        _ownedContract.unblockUser(userAddress);
    }
}
