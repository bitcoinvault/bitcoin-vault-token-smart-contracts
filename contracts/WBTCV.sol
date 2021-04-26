pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract WBTCV is ERC20Burnable, Ownable
{
    mapping(address => bool) public blocked;

    constructor() ERC20("Wrapped Bitcoin Vault", "WBTCV") {
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(blocked[msg.sender] == false, 'User is blocked');
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function mint(address addr, uint256 amount) public onlyOwner{
        super._mint(addr, amount);
    }

    function burn(uint256 amount) public override onlyOwner{
        super.burn(amount);
    }

    function blockUser(address userAddress) public onlyOwner{
        blocked[userAddress] = true;
    }

    function unblockUser(address userAddress) public onlyOwner{
        blocked[userAddress] = false;
    }
}