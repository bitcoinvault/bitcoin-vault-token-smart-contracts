const WBTCV = artifacts.require("WBTCV");
const WbtcvController = artifacts.require("WbtcvController");

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        await deployer.deploy(WBTCV);
        await deployer.deploy(WbtcvController, WBTCV.address, [accounts[0], accounts[8], accounts[9]]);
    });
};
