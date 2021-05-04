const WBTCV = artifacts.require("WBTCV");
const WbtcvController = artifacts.require("WbtcvController");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(WBTCV);
        await deployer.deploy(WbtcvController, WBTCV.address);
    });
};
