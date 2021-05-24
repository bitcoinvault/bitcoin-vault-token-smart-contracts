const WBTCV = artifacts.require("WBTCV");
const {
    time,
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

contract('WBTCV', (accounts) => {
    let instance;

    beforeEach(async () => {
        instance = await WBTCV.new();
    })

/// TOKEN FEATURES

  it('should have wBTCV name and 8 decimals precision', async () => {
    assert.equal(await instance.name(), "Wrapped Bitcoin Vault", "name should be Wrapped Bitcoin Vault");
    assert.equal(await instance.symbol(), "wBTCV", "symbol should be wBTCV");
    assert.equal(await instance.decimals(), 8, "decimal precision should be 8")
  });

  it('should have 0 coins as initial amount', async () => {
    balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('0'), "0 wasn't in the first account");
  });

  it('should increase value after mint', async () => {
    await instance.mint(accounts[0], 20);
    balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('20'), "20 wasn't the amount after mint");
  });

  it('should decrease value after burn', async () => {
    await instance.mint(accounts[0], 20);
    await instance.burn(10);
    balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('10'), "10 wasn't the amount after burn");
  });

  it('should perform succesful transfer', async () => {
    await instance.mint(accounts[0], 20);
    await instance.transfer(accounts[1], 3);
    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('17'), "17 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('3'), "3 wasn't the balance after transfer");
  });

/// BLOCKING FEATURE

  it('should not allow blocked user to make transfer', async () => {
    await instance.mint(accounts[1], 3);
    await instance.blockUser(accounts[1])
    await expectRevert(instance.transfer(accounts[2], 2, {from: accounts[1]}), 'User is blocked');
  });

  it('should allow unblocked user to make transfer', async () => {
    await instance.mint(accounts[1], 3);
    await instance.unblockUser(accounts[1]);
    await instance.transfer(accounts[2], 1, {from: accounts[1]});
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('2'), "2 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('1'), "1 wasn't the balance after transfer");
  });

  it('should not allow blocked user to make allowance', async () => {
    await instance.mint(accounts[1], 3);
    await instance.blockUser(accounts[1])
    await expectRevert(instance.approve(accounts[2], 1, {from: accounts[1]}), 'User is blocked');
  });

  it('should perform succesful transfer from allowance', async () => {
    await instance.mint(accounts[0], 10);
    await instance.approve(accounts[1], 2, {from: accounts[0]});
    allowance = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(web3.utils.toHex(allowance.valueOf()), web3.utils.toHex('2'), "2 wasn't the allowance");
    await instance.transferFrom(accounts[0], accounts[2], 1, {from: accounts[1]})
    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('9'), "9 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('0'), "0 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('1'), "1 wasn't the balance after transfer");
  });

/// ALERT FEATURE

  it('should add recovery address instantly if none set', async () => {
    assert.equal(await instance.recoveringAddresses(accounts[0]), "0x0000000000000000000000000000000000000000");
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
  });

  it('should add pendingRecoveringAddressChange when changing recovery address', async () => {
    assert.equal(await instance.recoveringAddresses(accounts[0]), "0x0000000000000000000000000000000000000000");
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.setNewRecoveringAddress(accounts[3], {from: accounts[0]});
    recoveringAddressChange = await instance.pendingRecoveringAddressChange(accounts[0]);
    assert.equal(web3.utils.toHex(recoveringAddressChange.blockNumber), web3.utils.toHex(await time.latestBlock().valueOf()), "recoveringAddressChange")
    assert.equal(recoveringAddressChange.newCancelAccount, accounts[3], "recoveringAddressChange")
  });

  it('should not change recovery address immediately if not null', async () => {
    assert.equal(await instance.recoveringAddresses(accounts[0]), "0x0000000000000000000000000000000000000000");
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.setNewRecoveringAddress(accounts[3], {from: accounts[0]});
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
  });

  it('should not process recovery address change for zero address', async () => {
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await expectRevert(instance.setNewRecoveringAddress("0x0000000000000000000000000000000000000000", {from: accounts[0]}),
        "new recovering address should not be 0 (use deleteRecoveringAddress?)");
  });

  it('should not confirm recovery address before ALERT_BLOCK_WAIT blocks', async () => {
    assert.equal(await instance.recoveringAddresses(accounts[0]), "0x0000000000000000000000000000000000000000");
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.setNewRecoveringAddress(accounts[3], {from: accounts[0]});

    await expectRevert(instance.confirmNewRecoveringAddress(accounts[3]), "recovering address change not ready");
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
  });

  it('should confirm recovery address after ALERT_BLOCK_WAIT blocks', async () => {
    assert.equal(await instance.recoveringAddresses(accounts[0]), "0x0000000000000000000000000000000000000000");
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.setNewRecoveringAddress(accounts[3], {from: accounts[0]});

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    await instance.confirmNewRecoveringAddress(accounts[3]);
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[3]);
  });

  it('should reject change recovery address after ALERT_BLOCK_WAIT blocks for invalid address', async () => {
    assert.equal(await instance.recoveringAddresses(accounts[0]), "0x0000000000000000000000000000000000000000");
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.setNewRecoveringAddress(accounts[3], {from: accounts[0]});

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    await expectRevert(instance.confirmNewRecoveringAddress(accounts[2]), "no pending recovering address change for this address");
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
  });

  it('should delete recovery address after ALERT_BLOCK_WAIT blocks', async () => {
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
    await instance.deleteRecoveringAddress({from: accounts[0]});

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    await instance.confirmDeleteRecoveringAddress();
    assert.equal(await instance.recoveringAddresses(accounts[0]), "0x0000000000000000000000000000000000000000");
  });

  it('should not delete recovery address before ALERT_BLOCK_WAIT blocks', async () => {
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
    await instance.deleteRecoveringAddress({from: accounts[0]});
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
  });

  it('should perform succesful transfer with alert', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('9'), "9 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('0'), "0 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('0'), "0 wasn't the balance after transfer");

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    await instance.redeemReadyAlerts(accounts[1]);
    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('9'), "9 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('1'), "1 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('0'), "0 wasn't the balance after transfer");
  });

  it('should revert if alert sent to zero address', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await expectRevert(instance.transfer("0x0000000000000000000000000000000000000000", 1, {from: accounts[0]}),
        "ERC20: transfer to the zero address");
  });

  it('should revert when retrieving alerts for zero address', async () => {
    await expectRevert(instance.getIncomingAlerts("0x0000000000000000000000000000000000000000"), "retrieving alerts for 0 address!");
    await expectRevert(instance.getReadyAlerts("0x0000000000000000000000000000000000000000"), "retrieving alerts for 0 address!");
  });

  it('should revert when trying to cancel or redeem alert to zero address', async () => {
    await expectRevert(instance.redeemReadyAlerts("0x0000000000000000000000000000000000000000"), "pushing alerts to 0 address!");
    await expectRevert(instance.cancelTransfers("0x0000000000000000000000000000000000000000"), "pushing alerts to 0 address!");
  });

  it('should leave not ready alert when redeeming a ready one', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    for(i = 0; i < 120; i++)
        await time.advanceBlock();

    await instance.transfer(accounts[1], 2, {from: accounts[0]});

    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('7'), "7 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('0'), "0 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('0'), "0 wasn't the balance after transfer");

    for(i = 0; i < 120; i++)
        await time.advanceBlock();

    await instance.redeemReadyAlerts(accounts[1]);
    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('7'), "7 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('1'), "1 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('0'), "0 wasn't the balance after transfer");
  });

  it('should list incoming alerts', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    incomingAlerts = await instance.getIncomingAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 1, "incoming alerts length not 1");
    assert.equal(incomingAlerts[0].sender, accounts[0], "incoming alerts");
    assert.equal(incomingAlerts[0].recipient, accounts[1], "incoming alerts");
    assert.equal(incomingAlerts[0].amount, 1, "incoming alerts");
    assert.equal(incomingAlerts[0].cancelAccount, accounts[2], "incoming alerts");
    assert.equal(web3.utils.toHex(incomingAlerts[0].blockNumber), web3.utils.toHex(await time.latestBlock().valueOf()), "incoming alerts");
  });

  it('should not list alerts in getReadyAlerts until alert ready to redeem', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 0, "ready alerts length not 0");

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 1, "ready alerts length not 1");
    assert.equal(incomingAlerts[0].sender, accounts[0], "ready alerts");
    assert.equal(incomingAlerts[0].recipient, accounts[1], "ready alerts");
    assert.equal(incomingAlerts[0].amount, 1, "ready alerts");
    assert.equal(incomingAlerts[0].cancelAccount, accounts[2], "ready alerts");
    assert.equal(web3.utils.toHex(incomingAlerts[0].blockNumber), web3.utils.toHex(await time.latestBlock().valueOf()) - web3.utils.toHex(240), "ready alerts");
  });

  it('should clean incoming alerts after ready alerts pushed', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    incomingAlerts = await instance.redeemReadyAlerts(accounts[1]);
    incomingAlerts = await instance.getIncomingAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 0, "incoming alerts length not 0");
  });

  it('should clean ready alerts after alerts pushed', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    incomingAlerts = await instance.redeemReadyAlerts(accounts[1]);
    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 0, "ready alerts length not 0");
  });

  it('should perform immediate transfer if recovery address deleted', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.deleteRecoveringAddress({from: accounts[0]});

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    await instance.confirmDeleteRecoveringAddress();
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('9'), "9 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('1'), "1 wasn't the balance after transfer");
  });

  it('should perform succesful cancellation of alert transfer', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    for(i = 0; i < 2; i++)
        await time.advanceBlock();

    await instance.cancelTransfers(accounts[1], {from: accounts[2]})
    incomingAlerts = await instance.getIncomingAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 0, "incoming alerts length not 0");

    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 0, "ready alerts length not 0");
  });

  it('should cancel two alerts from different senders', async () => {
    await instance.mint(accounts[0], 10);
    await instance.mint(accounts[2], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.setNewRecoveringAddress(accounts[0], {from: accounts[2]});
    await instance.transfer(accounts[1], 1, {from: accounts[2]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    for(i = 0; i < 2; i++)
        await time.advanceBlock();

    await instance.cancelTransfers(accounts[1], {from: accounts[2]})
    await instance.cancelTransfers(accounts[1], {from: accounts[0]})

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 0, "ready alerts length not 1");
  });

  it("should not cancel alert from other sender", async () => {
    await instance.mint(accounts[0], 10);
    await instance.mint(accounts[2], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.setNewRecoveringAddress(accounts[0], {from: accounts[2]});
    await instance.transfer(accounts[1], 1, {from: accounts[2]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});
    await instance.transfer(accounts[1], 2, {from: accounts[2]});
    await instance.transfer(accounts[1], 2, {from: accounts[0]});

    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('7'), "8 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('0'), "0 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('7'), "8 wasn't the balance after transfer");

    for(i = 0; i < 2; i++)
        await time.advanceBlock();
    await instance.cancelTransfers(accounts[1], {from: accounts[2]})

    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('10'), "10 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('0'), "1 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('7'), "0 wasn't the balance after transfer");

    for(i = 0; i < 240; i++)
        await time.advanceBlock();

    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 2, "ready alerts length not 1");

    await instance.redeemReadyAlerts(accounts[1]);
    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('10'), "9 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('3'), "1 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('7'), "0 wasn't the balance after transfer");
  });

  it('should not perform cancellation if request is from other address', async () => {
    await instance.mint(accounts[0], 10);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[1], 1, {from: accounts[0]});

    for(i = 0; i < 2; i++)
        await time.advanceBlock();

    await instance.cancelTransfers(accounts[1], {from: accounts[3]})
    incomingAlerts = await instance.getIncomingAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 1, "incoming alerts length not 1");

    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 0, "ready alerts length not 0");
  });

  it('should reject alert if not enough funds', async () => {
    await instance.mint(accounts[0], 3);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await expectRevert(instance.transfer(accounts[1], 4), "ERC20: transfer amount exceeds balance");
  });

  it('should not allow blocked user to make alert transfer', async () => {
    await instance.mint(accounts[1], 3);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[1]});
    await instance.blockUser(accounts[1])
    await expectRevert(instance.transfer(accounts[2], 2, {from: accounts[1]}), 'User is blocked');
  });

  it('should not allow alert and transferFrom interference', async () => {
    await instance.mint(accounts[0], 10);
    instance.approve(accounts[1], 6);
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    await instance.transfer(accounts[3], 7, {from: accounts[0]});
    await expectRevert(instance.transferFrom(accounts[0], accounts[3], 6, {from: accounts[1]}), "Balance too low for transfer");
  });

/// OWNERSHIP FEATURE

  it('should revert onlyOwner method calls from not owner', async () => {
    await expectRevert(instance.mint(accounts[0], 20, {from: accounts[1]}), 'Ownable: caller is not the owner');
    await expectRevert(instance.blockUser(accounts[0], {from: accounts[1]}), 'Ownable: caller is not the owner');
  });

});
