pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

struct Alert{
    address sender;
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
        incomingAlerts[recipient].push(Alert(msg.sender, recipient, amount, cancelAccount, block.number));

        emit SentAlert(msg.sender, recipient, amount, cancelAccount);
    }

    function getIncomingAlerts(address addr) public view returns (Alert[] memory){
        require(addr != address(0), "retrieving alerts for 0 address!");
        Alert[] memory l_incomingAlerts = new Alert[](incomingAlerts[addr].length);
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            l_incomingAlerts[i] = alert;
        }
        return l_incomingAlerts;
    }

    function getReadyAlerts(address addr) public view returns (Alert[] memory){
        require(addr != address(0), "retrieving alerts for 0 address!");
        uint j = 0;
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            if(alert.blockNumber + ALERT_BLOCK_WAIT <= block.number)
                j++;
        }

        Alert[] memory l_incomingAlerts = new Alert[](j);
        j = 0;
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            if(alert.recipient == address(0))
                continue;
            else if(alert.blockNumber + ALERT_BLOCK_WAIT <= block.number)
            {
                l_incomingAlerts[j] = alert;
                j++;
            }
        }

        return l_incomingAlerts;
    }

    function pushReadyAlerts(address addr) public{
        require(addr != address(0), "pushing alerts to 0 address!");
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            if(alert.recipient == address(0))
                continue;
            else if(alert.blockNumber + ALERT_BLOCK_WAIT <= block.number)
            {
                _balancesLockedToAlerts[alert.sender] = _balancesLockedToAlerts[alert.sender] - alert.amount;
                _transfer(alert.sender, alert.recipient, alert.amount);
                delete incomingAlerts[addr][i];
                if(i == incomingAlerts[addr].length - 1)
                    delete incomingAlerts[addr];
            }
        }
    }

    function cancelTransfers(address recipient) public{
        require(recipient != address(0), "pushing alerts to 0 address!");
        for (uint i = 0; i < incomingAlerts[recipient].length; i++) {
            Alert storage alert = incomingAlerts[recipient][i];
            if(alert.recipient == address(0))
                continue;
            else if(msg.sender == alert.cancelAccount)
            {
                _balancesLockedToAlerts[alert.sender] = _balancesLockedToAlerts[alert.sender] - alert.amount;
                delete incomingAlerts[recipient][i];
                if(i == incomingAlerts[recipient].length - 1)
                    delete incomingAlerts[recipient];
            }
        }
    }
}