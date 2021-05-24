// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./WBTCV.sol";

contract WbtcvTestable is WBTCV{

    function ALERT_BLOCK_WAIT() public view override returns (uint) {
        return 24;
    }
}
