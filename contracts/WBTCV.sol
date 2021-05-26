// SPDX-License-Identifier: MIT

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

struct PendingRecoveringAddressChange{
    uint blockNumber;
    address newCancelAccount;
}

contract WBTCV is ERC20Burnable, Ownable
{
    mapping(address => bool) public blocked;
    mapping(address => Alert[]) public incomingAlerts;
    mapping(address => uint256) private _balancesLockedToAlerts;
    mapping(address => address) public recoveringAddresses;
    mapping(address => PendingRecoveringAddressChange) public pendingRecoveringAddressChange;

    event SentAlert(address sender, address recipient, uint256 amount, address cancelAccount);
    event RedeemedAlert(address sender, address recipient, uint256 amount, address cancelAccount);
    event CancelledAlert(address sender, address recipient, uint256 amount, address cancelAccount);

    constructor() ERC20("Wrapped Bitcoin Vault", "wBTCV") {
    }

    function decimals() public view override returns (uint8) {
        return 8;
    }

    function ALERT_BLOCK_WAIT() public pure virtual returns (uint) {
        return 17280;
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(!blocked[msg.sender], 'User is blocked');
        if(address(0) != recoveringAddresses[msg.sender])
            _transferAlert(recipient, amount, recoveringAddresses[msg.sender]);
        else
            _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        require(!blocked[msg.sender], 'User is blocked');
        require(!blocked[sender], 'User is blocked');
        if(address(0) != recoveringAddresses[sender])
            revert("transferFrom and allowances not available for wBTCV secure accounts");
        else return super.transferFrom(sender, recipient, amount);
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        require(!blocked[msg.sender], 'User is blocked');
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override view{
        if(from != address(0))
            require(balanceOf(from) >= amount, "Balance too low for transfer");
    }

    function mint(address addr, uint256 amount) external onlyOwner{
        super._mint(addr, amount);
    }

    function burn(uint256 amount) public override onlyOwner{
        super.burn(amount);
    }

    function burnFrom(address account, uint256 amount) public override onlyOwner{
        revert("burnFrom method disabled");
    }

    function blockUser(address userAddress) external onlyOwner{
        blocked[userAddress] = true;
    }

    function unblockUser(address userAddress) external onlyOwner{
        blocked[userAddress] = false;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return super.balanceOf(account) - _balancesLockedToAlerts[account];
    }

    function _setNewRecoveringAddress(address newRecoveryAddress) private{
        if(recoveringAddresses[msg.sender] == address(0))
            recoveringAddresses[msg.sender] = newRecoveryAddress;
        else pendingRecoveringAddressChange[msg.sender] = PendingRecoveringAddressChange({blockNumber: block.number, newCancelAccount: newRecoveryAddress});
    }

    function setNewRecoveringAddress(address newRecoveryAddress) external{
        require(newRecoveryAddress != address(0), "new recovering address should not be 0 (use deleteRecoveringAddress?)");
        _setNewRecoveringAddress(newRecoveryAddress);
    }

    function confirmNewRecoveringAddress(address newRecoveryAddress) public{
        require(pendingRecoveringAddressChange[msg.sender].blockNumber + ALERT_BLOCK_WAIT() <= block.number, "recovering address change not ready");
        require(pendingRecoveringAddressChange[msg.sender].newCancelAccount == newRecoveryAddress, "no pending recovering address change for this address");
        recoveringAddresses[msg.sender] = newRecoveryAddress;
        delete pendingRecoveringAddressChange[msg.sender];
    }

    function deleteRecoveringAddress() external{
        _setNewRecoveringAddress(address(0));
    }

    function confirmDeleteRecoveringAddress() external{
        confirmNewRecoveringAddress(address(0));
    }

    function _transferAlert(address recipient, uint256 amount, address cancelAccount) private{
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(balanceOf(msg.sender) >= amount, "ERC20: transfer amount exceeds balance");

        _balancesLockedToAlerts[msg.sender] = _balancesLockedToAlerts[msg.sender] + amount;
        incomingAlerts[recipient].push(Alert(msg.sender, recipient, amount, cancelAccount, block.number));
        emit SentAlert(msg.sender, recipient, amount, cancelAccount);
    }

    function getIncomingAlerts(address addr) external view returns (Alert[] memory){
        require(addr != address(0), "retrieving alerts for 0 address!");
        Alert[] memory l_incomingAlerts = new Alert[](incomingAlerts[addr].length);
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            l_incomingAlerts[i] = alert;
        }
        return l_incomingAlerts;
    }

    function getReadyAlerts(address addr) external view returns (Alert[] memory){
        require(addr != address(0), "retrieving alerts for 0 address!");
        uint j = 0;
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            if(alert.recipient == address(0))
                continue;
            else if(alert.blockNumber + ALERT_BLOCK_WAIT() <= block.number)
                j++;
        }

        Alert[] memory l_incomingAlerts = new Alert[](j);
        j = 0;
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            if(alert.recipient == address(0))
                continue;
            else if(alert.blockNumber + ALERT_BLOCK_WAIT() <= block.number)
            {
                l_incomingAlerts[j] = alert;
                j++;
            }
        }

        return l_incomingAlerts;
    }

    function redeemReadyAlerts(address addr) external{
        require(addr != address(0), "pushing alerts to 0 address!");
        bool areIncomingAlertsLeft = false;
        for (uint i = 0; i < incomingAlerts[addr].length; i++) {
            Alert storage alert = incomingAlerts[addr][i];
            if(alert.recipient == address(0))
                continue;
            else if(alert.blockNumber + ALERT_BLOCK_WAIT() <= block.number)
            {
                _balancesLockedToAlerts[alert.sender] = _balancesLockedToAlerts[alert.sender] - alert.amount;
                _transfer(alert.sender, alert.recipient, alert.amount);
                emit RedeemedAlert(alert.sender, alert.recipient, alert.amount, alert.cancelAccount);
                delete incomingAlerts[addr][i];
            }
            else areIncomingAlertsLeft = true;
        }
        if(!areIncomingAlertsLeft)
            delete incomingAlerts[addr];
    }

    function cancelTransfers(address recipient) external{
        require(recipient != address(0), "pushing alerts to 0 address!");
        bool areIncomingAlertsLeft = false;
        for (uint i = 0; i < incomingAlerts[recipient].length; i++) {
            Alert storage alert = incomingAlerts[recipient][i];
            if(alert.recipient == address(0))
                continue;
            else if(msg.sender == alert.cancelAccount)
            {
                _balancesLockedToAlerts[alert.sender] = _balancesLockedToAlerts[alert.sender] - alert.amount;
                emit CancelledAlert(alert.sender, alert.recipient, alert.amount, alert.cancelAccount);
                delete incomingAlerts[recipient][i];
            }
            else areIncomingAlertsLeft = true;
        }
        if(!areIncomingAlertsLeft)
            delete incomingAlerts[recipient];
    }
}