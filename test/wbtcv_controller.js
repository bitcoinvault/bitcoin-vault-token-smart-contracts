const WBTCV = artifacts.require("WBTCV");
const WbtcvController = artifacts.require("WbtcvController");
const {BN, expectRevert } = require('@openzeppelin/test-helpers');

contract('WbtcvController', (accounts) => {

    let wbtcv;
    let wbtcv_controller;

    beforeEach(async () => {
        wbtcv = await WBTCV.new();
        wbtcv_controller = await WbtcvController.new(wbtcv.address, [accounts[0], accounts[8], accounts[9]]);
        await wbtcv.transferOwnership(wbtcv_controller.address);
    })

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

  it('should reject signature of not proposed mint', async () => {
      await wbtcv_controller.mint(wbtcv_controller.address, 20);
      await expectRevert(wbtcv_controller.signMint(wbtcv_controller.address, 12, {from: accounts[8]}), "Mint proposal not present");
  });

  it('should add pending burn proposal', async () => {
    await wbtcv_controller.mint(wbtcv_controller.address, 20);
    await wbtcv_controller.signMint(wbtcv_controller.address, 20, {from: accounts[8]});
    balance = await wbtcv.balanceOf.call(wbtcv_controller.address);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('20'), "mint target account balance should be 20 after mint proposal second signature");
    await wbtcv_controller.burn(10);
    assert.equal(await wbtcv_controller.getBurnsCount(), 1, "Should have one pending burn");
    pendingMint = await wbtcv_controller.pendingBurns(0);
    assert.equal(pendingMint["amount"].valueOf(), 10, "Should have one PendingBurn");
    assert.equal(pendingMint["addressSigned"], accounts[0], "Should have one PendingBurn");
  });

  it('should reject burn proposal if not enough funds', async () => {
    const wbtcv_controller = await WbtcvController.deployed();
    await wbtcv_controller.mint(accounts[1], 5);
    await expectRevert(wbtcv_controller.burn(10), "Not enough funds to burn!");

  });

  it('should subtract burned amount if burn proposal signed by two', async () => {
      await wbtcv_controller.mint(wbtcv_controller.address, 20);
      await wbtcv_controller.signMint(wbtcv_controller.address, 20, {from: accounts[8]});
      balance = await wbtcv.balanceOf.call(wbtcv_controller.address);
      assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('20'), "mint target account balance should be 20 after mint proposal second signature");
      await wbtcv_controller.burn(8);
      await wbtcv_controller.signBurn(8, {from: accounts[8]});
      balance = await wbtcv.balanceOf.call(wbtcv_controller.address);
      assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('12'), "balance should be 12 after burn");
  });

  it('should reject burn proposal signature if not enough funds', async () => {
      await wbtcv_controller.mint(wbtcv_controller.address, 20);
      await wbtcv_controller.signMint(wbtcv_controller.address, 20, {from: accounts[8]});
      await wbtcv_controller.burn(12);
      await wbtcv_controller.burn(14);
      await wbtcv_controller.signBurn(12, {from: accounts[8]});
      balance = await wbtcv.balanceOf.call(wbtcv_controller.address);
      assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('8'), "balance should be 8 after burn");
      await expectRevert(wbtcv_controller.burn(14), "Not enough funds to burn!");
  });

  it('should reject signature of not proposed burn', async () => {
      await wbtcv_controller.mint(wbtcv_controller.address, 20);
      await wbtcv_controller.signMint(wbtcv_controller.address, 20, {from: accounts[8]});
      await wbtcv_controller.burn(14);
      await expectRevert(wbtcv_controller.signBurn(12, {from: accounts[8]}), "Burn proposal not present");
  });
});
