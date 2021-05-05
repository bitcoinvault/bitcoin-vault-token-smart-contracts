const WBTCV = artifacts.require("WBTCV");
const WbtcvController = artifacts.require("WbtcvController");
const {BN, expectRevert } = require('@openzeppelin/test-helpers');

contract('WbtcvController', (accounts) => {

  it('should not deploy if signers count is 2', async () => {
    const wbtcv = await WBTCV.deployed();
    await expectRevert(WbtcvController.new(wbtcv.address, [accounts[0], accounts[1]]), "There should be 3 signers");
  });

  it('should not deploy if signers count is 4', async () => {
    const wbtcv = await WBTCV.deployed();
    await expectRevert(WbtcvController.new(wbtcv.address, [accounts[0], accounts[1], accounts[2], accounts[3]]), "There should be 3 signers");
  });

  it('should add pending mint proposal', async () => {
    const wbtcv_controller = await WbtcvController.deployed();
    await wbtcv_controller.mint(accounts[1], 20);
    assert.equal(await wbtcv_controller.getMintsCount(), 1, "Should have one pending mint");
    pendingMint = await wbtcv_controller.pendingMints(0);
    assert.equal(pendingMint["addr"], accounts[1], "Should have one PendingMints");
    assert.equal(pendingMint["amount"].valueOf(), 20, "Should have one PendingMints");
    assert.equal(pendingMint["addressSigned"], accounts[0], "Should have one PendingMints");
  });

  it('should add minted amount if mint proposal signed by two', async () => {
    const wbtcv = await WBTCV.deployed();
    const wbtcv_controller = await WbtcvController.new(wbtcv.address, [accounts[0], accounts[8], accounts[9]]);
    wbtcv.transferOwnership(wbtcv_controller.address);
    balance = await wbtcv.balanceOf.call(accounts[9]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('0'), "mint target account balance should be 0 before mint proposal");
    await wbtcv_controller.mint(accounts[1], 20, {from: accounts[0]});
    assert.equal((await wbtcv_controller.getMintsCount()).valueOf(), 1, "Should have one pending mint");
    balance = await wbtcv.balanceOf.call(accounts[1]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('0'), "mint target account balance should be 0 before mint proposal second signature");
    await wbtcv_controller.signMint(accounts[1], 20, {from: accounts[8]});
    balance = await wbtcv.balanceOf.call(accounts[1]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('20'), "mint target account balance should be 20 after mint proposal second signature");
  });

  it('should add minted amount once if only one proposal out of two signed', async () => {
    const wbtcv = await WBTCV.new();
    const wbtcv_controller = await WbtcvController.new(wbtcv.address, [accounts[0], accounts[8], accounts[9]]);
    await wbtcv.transferOwnership(wbtcv_controller.address);
    balance = await wbtcv.balanceOf.call(accounts[9]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('0'), "mint target account balance should be 0 before mint proposal");
    await wbtcv_controller.mint(accounts[1], 20, {from: accounts[0]});
    assert.equal((await wbtcv_controller.getMintsCount()).valueOf(), 1, "Should have one pending mint");
    await wbtcv_controller.mint(accounts[1], 20, {from: accounts[0]});
    assert.equal((await wbtcv_controller.getMintsCount()).valueOf(), 2, "Should have two pending mints");
    balance = await wbtcv.balanceOf.call(accounts[1]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('0'), "mint target account balance should be 0 before mint proposal second signature");
    await wbtcv_controller.signMint(accounts[1], 20, {from: accounts[8]});
    balance = await wbtcv.balanceOf.call(accounts[1]);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('20'), "mint target account balance should be 20 after mint proposal second signature");
  });

});
