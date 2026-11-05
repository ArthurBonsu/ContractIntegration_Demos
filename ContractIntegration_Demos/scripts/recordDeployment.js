// Writes each deployed contract into utils/deployments.json, keyed by chain id, in the same
// shape as the main project's deployments.json. The front end reads that file.
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "utils", "deployments.json");

module.exports = async function record({ web3, contractName, contractClass, instance, blockBefore }) {
  const chainId = String(await web3.eth.getChainId());
  const networkId = String(await web3.eth.net.getId());
  let all = {};
  try {
    all = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    /* first deployment */
  }
  const entry = all[chainId] || { chainId: Number(chainId), networkId };
  entry[contractName] = {
    address: instance.address,
    txHash: (contractClass && contractClass.transactionHash) || instance.transactionHash,
    startBlock: Number(blockBefore) + 1,
  };
  entry.updatedAt = new Date().toISOString();
  all[chainId] = entry;
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n");
  console.log(`   > recorded ${contractName} on chain ${chainId}`);
};
