pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract WBTCV is ERC20Burnable, Ownable
{
    constructor(uint256 initialAmount) ERC20("Wrapped Bitcoin Vault", "WBTCV") {
        super._mint(_msgSender(), initialAmount);
    }
}
