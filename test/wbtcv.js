const WBTCV = artifacts.require("WBTCV");
const {
    time,
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

contract('WBTCV', (accounts) => {

/// TOKEN FEATURES

  it('should have 0 coins as initial amount', async () => {
    const instance = await WBTCV.deployed();
    balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('0'), "0 wasn't in the first account");
  });

  it('should increase value after mint', async () => {
    const instance = await WBTCV.deployed();
    await instance.mint(accounts[0], 20);
    balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('20'), "20 wasn't the amount after mint");
  });

  it('should decrease value after burn', async () => {
    const instance = await WBTCV.deployed();
    await instance.burn(10);
    balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('10'), "10 wasn't the amount after burn");
  });

  it('should not increase value after mint from not owner', async () => {
    const instance = await WBTCV.deployed();
    await expectRevert(instance.mint(accounts[0], 20, {from: accounts[1]}), 'Ownable: caller is not the owner');
  });

  it('should perform succesful transfer', async () => {
    const instance = await WBTCV.deployed();
    await instance.transfer(accounts[1], 3);
    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('7'), "7 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('3'), "3 wasn't the balance after transfer");
  });

/// BLOCKING FEATURE

  it('should not allow blocked user to make transfer', async () => {
    const instance = await WBTCV.deployed();
    await instance.blockUser(accounts[1])
    await expectRevert(instance.transfer(accounts[2], 2, {from: accounts[1]}), 'User is blocked');
  });

  it('should allow unblocked user to make transfer', async () => {
    const instance = await WBTCV.deployed();
    await instance.unblockUser(accounts[1]);
    await instance.transfer(accounts[2], 1, {from: accounts[1]});
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('2'), "2 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('1'), "1 wasn't the balance after transfer");
  });

  it('should not allow blocked user to make allowance', async () => {
    const instance = await WBTCV.deployed();
    await instance.blockUser(accounts[1])
    await expectRevert(instance.approve(accounts[2], 1, {from: accounts[1]}), 'User is blocked');
  });

  it('should perform succesful transfer from allowance', async () => {
    const instance = await WBTCV.deployed();
    await instance.approve(accounts[1], 2, {from: accounts[0]});
    allowance = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(web3.utils.toHex(allowance.valueOf()), web3.utils.toHex('2'), "2 wasn't the allowance");
    await instance.transferFrom(accounts[0], accounts[2], 2, {from: accounts[1]})
    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('5'), "5 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('2'), "2 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('3'), "3 wasn't the balance after transfer");
  });

/// ALERT FEATURE

  it('should perform succesful transfer with alert', async () => {
    const instance = await WBTCV.deployed();

    await instance.transferAlert(accounts[1], 1, accounts[2]);
    balance0 = await instance.balanceOf.call(accounts[0]);
    balance1 = await instance.balanceOf.call(accounts[1]);
    balance2 = await instance.balanceOf.call(accounts[2]);
    assert.equal(web3.utils.toHex(balance0.valueOf()), web3.utils.toHex('4'), "4 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance1.valueOf()), web3.utils.toHex('2'), "2 wasn't the balance after transfer");
    assert.equal(web3.utils.toHex(balance2.valueOf()), web3.utils.toHex('3'), "3 wasn't the balance after transfer");

    incomingAlerts = await instance.getIncomingAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 1, "incoming alerts length not 1");
    assert.equal(incomingAlerts[0].recipient, accounts[1], "incoming alerts");
    assert.equal(incomingAlerts[0].amount, 1, "incoming alerts");
    assert.equal(incomingAlerts[0].cancelAccount, accounts[2], "incoming alerts");
    assert.equal(web3.utils.toHex(incomingAlerts[0].blockNumber), web3.utils.toHex(await time.latestBlock().valueOf()), "incoming alerts");

    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 0, "ready alerts length not 0");
    for(i = 0; i < 240; i++)
        await time.advanceBlock();
    incomingAlerts = await instance.getReadyAlerts(accounts[1]);
    assert.equal(incomingAlerts.length, 1, "ready alerts length not 1");
    assert.equal(incomingAlerts[0].recipient, accounts[1], "ready alerts");
    assert.equal(incomingAlerts[0].amount, 1, "ready alerts");
    assert.equal(incomingAlerts[0].cancelAccount, accounts[2], "ready alerts");
    assert.equal(web3.utils.toHex(incomingAlerts[0].blockNumber), web3.utils.toHex(await time.latestBlock().valueOf()) - web3.utils.toHex(240), "ready alerts");
  });

});