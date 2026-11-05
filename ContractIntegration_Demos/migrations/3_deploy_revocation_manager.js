const VehicleRegistry = artifacts.require("VehicleRegistry");
const RevocationManager = artifacts.require("RevocationManager");
const record = require("../scripts/recordDeployment");

const ZERO = "0x0000000000000000000000000000000000000000";

module.exports = async function (deployer, network, accounts) {
  const blockBefore = await web3.eth.getBlockNumber();
  const registry = await VehicleRegistry.deployed();
  await deployer.deploy(RevocationManager, registry.address);
  const revocation = await RevocationManager.deployed();

  // One-time wiring: the registry must know the RevocationManager so a revoked wallet
  // cannot register a fresh identity. Safe to re-run: it only wires once.
  const current = await registry.revocationManager();
  if (current === ZERO) {
    await registry.setRevocationManager(revocation.address);
    console.log("   > VehicleRegistry wired to RevocationManager");
  } else if (current.toLowerCase() !== revocation.address.toLowerCase()) {
    throw new Error(`VehicleRegistry is already wired to a different RevocationManager (${current}). Re-deploy everything with: truffle migrate --reset`);
  }

  await record({ web3, networkId: await web3.eth.net.getId(), contractName: "RevocationManager", contractClass: RevocationManager, blockBefore, instance: revocation });
};
