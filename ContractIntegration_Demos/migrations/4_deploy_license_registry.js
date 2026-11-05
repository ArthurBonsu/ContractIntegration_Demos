const VehicleRegistry = artifacts.require("VehicleRegistry");
const RevocationManager = artifacts.require("RevocationManager");
const LicenseRegistry = artifacts.require("LicenseRegistry");
const record = require("../scripts/recordDeployment");

module.exports = async function (deployer) {
  const blockBefore = await web3.eth.getBlockNumber();
  const registry = await VehicleRegistry.deployed();
  const revocation = await RevocationManager.deployed();
  await deployer.deploy(LicenseRegistry, registry.address, revocation.address);
  const license = await LicenseRegistry.deployed();
  await record({ web3, networkId: await web3.eth.net.getId(), contractName: "LicenseRegistry", contractClass: LicenseRegistry, blockBefore, instance: license });
};
