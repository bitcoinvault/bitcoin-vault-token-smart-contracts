pragma solidity ^0.8.0;

import "./WBTCV.sol";

contract WbtcvController {
    WBTCV private _ownedContract;
    constructor(WBTCV ownedContract){
        _ownedContract = ownedContract;
    }

    function mint(address addr, uint256 amount) public{
        _ownedContract.mint(addr, amount);
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
