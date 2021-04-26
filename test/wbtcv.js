const WBTCV = artifacts.require("WBTCV");
const {
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

contract('WBTCV', (accounts) => {
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

});
