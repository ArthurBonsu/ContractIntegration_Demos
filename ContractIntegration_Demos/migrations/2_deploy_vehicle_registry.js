const VehicleRegistry = artifacts.require("VehicleRegistry");
const record = require("../scripts/recordDeployment");

module.exports = async function (deployer, network) {
  const blockBefore = await web3.eth.getBlockNumber();
  await deployer.deploy(VehicleRegistry);
  const registry = await VehicleRegistry.deployed();
  await record({ web3, networkId: await web3.eth.net.getId(), contractName: "VehicleRegistry", contractClass: VehicleRegistry, blockBefore, instance: registry });
};
