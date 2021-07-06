// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;
import "./WBTCV.sol";

contract WbtcvTestable is WBTCV{

    function alertBlockWait() public pure override returns (uint) {
        return 4;
    }
}
