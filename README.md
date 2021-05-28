# Contract project
Install dependencies with npm:
`npm install`

Compile:
`truffle compile`

Run tests:
`truffle test`

# Bitcoin Vault
Bitcoin Vault (BTCV) is a cryptocurrency allowing users to Cancel transactions, send Secure payments, as well as bypass the safety features and send Fast Secure transactions.
Bitcoin Vault allows users to reverse transactions within 24 hours (144 blocks) using Cancel Private Key. If your local wallet's security is compromised, you can cancel the fraudulent money transfer and protect your assets.

# Wrapped BTCV
Wrapped Bitcoin Vault (wBTCV) is a tokenised form of BTCV cryptocurrency to use with Binance Smart Chain ecosystem. Contract allows standard ERC20/BEP20 operations plus secure (reversable in 24 hours) transfers.

## Secure transaction
### Setting account for Secure Transfer sending
* For specific account, call `setNewRecoveringAddress(<new recovering address>)`
* Public state variable `pendingRecoveringAddressChange[<address>]` indicates pending recovering address' change (s)
* Wait 17280 block on BSC network (~24 hours)
* Call `confirmNewRecoveringAddress (<new recovering address>)`
* From now on, until recovering address for specific address is deleted, transfers will be sent as Secure Transfers

### Sending Secure Transfer
* Set account for Secure Transfer sending (see above)
* Call `transfer(<recipient>, <amount>)` (ERC20/BEP20) function
* `getIncomingAlerts(<recipient>)` function indicates all incoming Secure Transfer alerts  
* `getReadyAlerts(<recipient>)` function indicates incoming Secure Transfer alerts that are ready for redeeming
* Wait 17280 block on BSC network (~24 hours)
* Call `redeemReadyAlerts(<recipient>)` to redeem all ready alerts for recipient address

### Cancelling Secure Transfer
* Send Secure Transfer (see above)
* Before Secure Transfer is redeemed, call `cancelTransfers(<recipient>)` from recovering account
* All Secure Transfers from sender to recipient address that were not redeemed will be cancelled

### Setting Secure Transfer account to standard account
* Call `deleteRecoveringAddress()`
* Public state variable `pendingRecoveringAddressChange[<address>]` indicates pending recovering address' change (s)
* Wait 17280 block on BSC network (~24 hours)
* Call `confirmDeleteRecoveringAddress()`
* Recovering address for sender will be deleted and `transfer` function will now perform standard (immediate) transfers

## Deployment
wBTCV system consists of two contracts: wBTCV BEP-20 token contract and Controller contract, which takes 
as arguments token contract address and list of signers. In current Controller implementation it is not possible 
to change signers or controlled token contract address, but another Controller may be deployed and ownerhip of token may be transferred. After both contracts are deployed,
token contract ownership shall be transfered from deploying address to controller contract (or from one controller to another in case controller is being updated).

Ownership transfer from deploying account to Controller in truffle suite:
```aidl
> wbtcv = await WBTCV.deployed()
undefined
> wbtcv.address
<token addr>
> controller = await WbtcvController.new(<token addr>, [<signer1>, <signer2>, <signer3>])
undefined
> controller.ownedContract()
<token addr>
> controller.address
<controller addr>
> await wbtcv.transferOwnership(<controller addr>)
<tx receipt>>
```
Transfer ownership to updated controller:
```aidl
> controller2 = await WbtcvController2.new("0x95db0f0d2a2B017f6DF55B3b6202B2552d7372b2", [accounts[0], accounts[1], accounts[2]])
undefined
> controller2.address
<controller2 address>
> await controller.transferOwnership(<controller2 address>, {from: <signer1>})
<tx receipt>
> await controller.signTransferOwnership(<controller2 address>, {from: <signer2>})
<tx receipt>

```
