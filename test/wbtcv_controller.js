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


  it('should reject signature of not proposed burn', async () => {
      await wbtcv_controller.mint(wbtcv_controller.address, 20);
      await wbtcv_controller.signMint(wbtcv_controller.address, 20, {from: accounts[8]});
      await wbtcv_controller.burn(14);
      await expectRevert(wbtcv_controller.signBurn(12, {from: accounts[8]}), "Burn proposal not present");
  });

  it('should block user if called by signer', async () => {
      await wbtcv_controller.mint(accounts[1], 20);
      await wbtcv_controller.signMint(accounts[1], 20, {from: accounts[8]});
      await wbtcv_controller.blockUser(accounts[1], {from: accounts[8]});
      await expectRevert(wbtcv.transfer(accounts[2], 10, {from: accounts[1]}), "User is blocked");
  });

  it('should not block user if not called by signer', async () => {
      await wbtcv_controller.mint(accounts[1], 20);
      await wbtcv_controller.signMint(accounts[1], 20, {from: accounts[8]});
      await expectRevert(wbtcv_controller.blockUser(accounts[1], {from: accounts[7]}), "Feature is only available for approved signers");
  });

  it('should unblock user if called by signer', async () => {
      await wbtcv_controller.mint(accounts[1], 20);
      await wbtcv_controller.signMint(accounts[1], 20, {from: accounts[8]});
      await wbtcv_controller.blockUser(accounts[1], {from: accounts[8]});
      await wbtcv_controller.unblockUser(accounts[1], {from: accounts[8]});
      await wbtcv.transfer(accounts[2], 2, {from: accounts[1]});
      balance = await wbtcv.balanceOf.call(accounts[1]);
      assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('18'), "18 wasn't the balance after transfer");
  });

  it('should not unblock user if not called by signer', async () => {
      await wbtcv_controller.mint(accounts[1], 20);
      await wbtcv_controller.signMint(accounts[1], 20, {from: accounts[8]});
      await wbtcv_controller.blockUser(accounts[1], {from: accounts[8]});
      await expectRevert(wbtcv_controller.unblockUser(accounts[1], {from: accounts[2]}), "Feature is only available for approved signers");
  });

  it('should transfer ownership of token contract', async () => {
      assert.equal(await wbtcv.owner.call(), wbtcv_controller.address);
      await wbtcv_controller.transferOwnership(accounts[5]);
      await wbtcv_controller.signTransferOwnership(accounts[5], {from: accounts[8]});
      assert.equal(await wbtcv.owner.call(), accounts[5]);
  });

  it('should reject ownership transfer proposal from not signer', async () => {
      assert.equal(await wbtcv.owner.call(), wbtcv_controller.address);
      await expectRevert(wbtcv_controller.transferOwnership(accounts[5], {from: accounts[1]}), "Feature is only available for approved signers");
  });

  it('should reject signature attempt of ownership transfer proposal from not signer', async () => {
      assert.equal(await wbtcv.owner.call(), wbtcv_controller.address);
      await wbtcv_controller.transferOwnership(accounts[5]);
      await expectRevert(wbtcv_controller.signTransferOwnership(accounts[5], {from: accounts[1]}), "Feature is only available for approved signers");
      assert.equal(await wbtcv.owner.call(), wbtcv_controller.address);
  });

  it('should reject ownership transfer signature of not proposed change', async () => {
      assert.equal(await wbtcv.owner.call(), wbtcv_controller.address);
      await expectRevert(wbtcv_controller.signTransferOwnership(accounts[5], {from: accounts[8]}), "Ownership transfer proposal not present");
      assert.equal(await wbtcv.owner.call(), wbtcv_controller.address);
  });

  it('should transfer ownership when other proposals present', async () => {
      await wbtcv_controller.transferOwnership(accounts[4]);
      await wbtcv_controller.transferOwnership(accounts[5]);
      await wbtcv_controller.transferOwnership(accounts[6]);
      await wbtcv_controller.signTransferOwnership(accounts[5], {from: accounts[8]});
      assert.equal(await wbtcv.owner.call(), accounts[5]);
  });

  it('should reject ownership transfer proposal to zero address', async () => {
      assert.equal(await wbtcv.owner.call(), wbtcv_controller.address);
      await expectRevert(wbtcv_controller.transferOwnership("0x0000000000000000000000000000000000000000", {from: accounts[8]}), "Ownable: new owner is the zero address");
  });

  it('should forward pauseToken to token', async () => {
      await wbtcv_controller.pauseToken();
      assert.equal(await wbtcv.paused(), true, "token not paused");
  });

  it('should forward unpauseToken to token', async () => {
      await wbtcv_controller.pauseToken();
      await wbtcv_controller.unpauseToken();
      assert.equal(await wbtcv.paused(), false, "unpaused token still paused");
  });

  it('should not pause if not signer', async () => {
      await expectRevert(wbtcv_controller.pauseToken({from: accounts[1]}), "Feature is only available for approved signers");
  });

  it('should not unpause if not signer', async () => {
      await wbtcv_controller.pauseToken();
      await expectRevert(wbtcv_controller.unpauseToken({from: accounts[1]}), "Feature is only available for approved signers");
  });
});
