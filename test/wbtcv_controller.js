const WBTCV = artifacts.require("WBTCV");
const WbtcvController = artifacts.require("WbtcvController");

contract('WbtcvController', (accounts) => {
  it('should forward mint calls to owned contract', async () => {
    const wbtcv = await WBTCV.deployed();
    const wbtcv_controller = await WbtcvController.deployed();
    wbtcv.transferOwnership(wbtcv_controller.address);
    balance = await wbtcv.balanceOf.call(wbtcv_controller.address);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('0'), "0 wasn't in the first account");
    await wbtcv_controller.mint(wbtcv_controller.address, 1000)
    balance = await wbtcv.balanceOf.call(wbtcv_controller.address);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('1000'), "1000 wasn't in the first account");
  });

  it('should forward burn calls to owned contract', async () => {
    const wbtcv = await WBTCV.deployed();
    const wbtcv_controller = await WbtcvController.deployed();
    await wbtcv_controller.burn(500)
    balance = await wbtcv.balanceOf.call(wbtcv_controller.address);
    assert.equal(web3.utils.toHex(balance.valueOf()), web3.utils.toHex('500'), "500 wasn't in the first account");
  });
});
