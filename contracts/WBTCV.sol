pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract WBTCV is ERC20Burnable, Ownable
{
    constructor() ERC20("Wrapped Bitcoin Vault", "WBTCV") {
    }

    function mint(address addr, uint256 amount) public onlyOwner{
        super._mint(addr, amount);
    }

    function burn(uint256 amount) public override onlyOwner{
        super.burn(amount);
    }
}
