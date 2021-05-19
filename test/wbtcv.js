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

    await expectRevert(instance.confirmNewRecoveringAddress(accounts[2]), "pending recovering address change for other address");
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
  });

  it('should delete recovery address', async () => {
    await instance.setNewRecoveringAddress(accounts[2], {from: accounts[0]});
    assert.equal(await instance.recoveringAddresses(accounts[0]), accounts[2]);
    await instance.deleteRecoveringAddress({from: accounts[0]});
    assert.equal(await instance.recoveringAddresses(accounts[0]), "0x0000000000000000000000000000000000000000");
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

/// OWNERSHIP FEATURE

  it('should revert onlyOwner method calls from not owner', async () => {
    await expectRevert(instance.mint(accounts[0], 20, {from: accounts[1]}), 'Ownable: caller is not the owner');
    await expectRevert(instance.blockUser(accounts[0], {from: accounts[1]}), 'Ownable: caller is not the owner');
  });

});
