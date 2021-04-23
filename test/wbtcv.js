const WBTCV = artifacts.require("WBTCV");

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

});
