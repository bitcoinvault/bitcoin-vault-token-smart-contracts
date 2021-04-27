pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

struct Alert{
    address recipient;
    uint256 amount;
    address cancelAccount;
    uint blockNumber;
}

contract WBTCV is ERC20Burnable, Ownable
{
    mapping(address => bool) public blocked;
    mapping(address => Alert[]) public incomingAlerts;
    mapping (address => uint256) private _balancesLockedToAlerts;

    uint public constant ALERT_BLOCK_WAIT = 240;

    event SentAlert(address sender, address recipient, uint256 amount, address cancelAccount);

    constructor() ERC20("Wrapped Bitcoin Vault", "WBTCV") {
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(blocked[msg.sender] == false, 'User is blocked');
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        require(blocked[msg.sender] == false, 'User is blocked');
        _approve(_msgSender(), spender, amount);
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

    function balanceOf(address account) public view override returns (uint256) {
        return super.balanceOf(account) - _balancesLockedToAlerts[account];
    }

    function transferAlert(address recipient, uint256 amount, address cancelAccount) public{
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(balanceOf(msg.sender) >= amount, "ERC20: transfer amount exceeds balance");

        _balancesLockedToAlerts[msg.sender] = _balancesLockedToAlerts[msg.sender] + amount;
        incomingAlerts[recipient].push(Alert(recipient, amount, cancelAccount, block.number));

        emit SentAlert(msg.sender, recipient, amount, cancelAccount);
    }

    function getIncomingAlerts(address addr) public view returns (Alert[] memory){
        Alert[] memory l_incomingAlerts = new Alert[](incomingAlerts[addr].length);
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            l_incomingAlerts[i] = alert;
        }
        return l_incomingAlerts;
    }

    function getReadyAlerts(address addr) public view returns (Alert[] memory){
        uint j = 0;
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            if(alert.blockNumber + ALERT_BLOCK_WAIT <= block.number)
                j++;
        }
        Alert[] memory l_incomingAlerts0;
        if(j == 0)
            return l_incomingAlerts0;
        Alert[] memory l_incomingAlerts = new Alert[](j);
        j = 0;
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            if(alert.blockNumber + ALERT_BLOCK_WAIT <= block.number)
            {
                l_incomingAlerts[j] = alert;
                j++;
            }
        }
        return l_incomingAlerts;
    }
}