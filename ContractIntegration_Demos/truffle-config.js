// -----------------------------------------------------------------------------
// Truffle config, taken from the main project (ClassTryout) and trimmed for this demo.
//   npm run chain            local Ganache on port 7545 (network id 5777, chain id 1337)
//   npm run deploy:local     deploy the three contracts to it
//   npm run deploy:sepolia   deploy to the free Sepolia test network (needs a TESTNET_ wallet)
//
// The network list comes from shared/chains.json, a copy of the main project's list, so chain ids agree.
// Secrets live in .env.local or env.local (never committed, never behind a NEXT_PUBLIC_ name):
//   TESTNET_PRIVATE_KEY or TESTNET_MNEMONIC     the wallet that signs the deployment
//   INFURA_PROJECT_ID, RPC_URL_<KEY>            optional RPC overrides (same order as the main project)
// Real-money networks are not configured here on purpose.
// -----------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const { chains } = require("./shared/chains.json");

// Truffle only reads ".env" on its own. Load the others too (the first file that sets a variable wins).
for (const file of [".env.local", "env.local", ".env"]) {
  const filePath = path.resolve(__dirname, file);
  if (fs.existsSync(filePath)) dotenv.config({ path: filePath });
}

// Same order as the main project's shared/rpc.ts: override, Infura, then the public RPC.
function rpcUrl(chain) {
  const override = process.env["RPC_URL_" + chain.key.toUpperCase()];
  if (override) return override;
  if (process.env.INFURA_PROJECT_ID && chain.infura) {
    return `https://${chain.infura}.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  }
  return chain.rpcUrls[0];
}

// Opens the deploying wallet for one network. Called only when you run `--network <key>`.
function openWallet(chain) {
  const key = (process.env.TESTNET_PRIVATE_KEY || "").trim();
  const mnemonic = (process.env.TESTNET_MNEMONIC || "").trim();
  if (!key && !mnemonic) {
    throw new Error("Set TESTNET_PRIVATE_KEY or TESTNET_MNEMONIC in .env.local to deploy to " + chain.name + ".");
  }
  const options = key
    ? { privateKeys: [key.replace(/^0x/, "")] }
    : { mnemonic: { phrase: mnemonic } };
  const provider = new HDWalletProvider({ ...options, providerOrUrl: rpcUrl(chain) });
  console.log(`   > ${chain.name} (chain ${chain.chainId}): deploying as ${provider.getAddresses()[0]}`);
  return provider;
}

const networks = {};

// `truffle test` makes its own throwaway chain when no "development" network is configured.
if (!process.argv.includes("test")) {
  networks.development = { host: "127.0.0.1", port: 7545, network_id: "*" };
}

// Free test networks (Sepolia and the others in chains.json).
for (const chain of chains) {
  if (chain.kind === "Local" || !chain.testnet) continue;
  networks[chain.key] = {
    provider: () => openWallet(chain),
    network_id: chain.chainId, // Truffle refuses to continue if the RPC answers with a different chain
    confirmations: 2,
    timeoutBlocks: 200,
    skipDryRun: true,
  };
}

module.exports = {
  networks,
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        // "paris" avoids the PUSH0 opcode so the same bytecode deploys on every chain in chains.json.
        evmVersion: "paris",
        optimizer: { enabled: true, runs: 200 },
      },
    },
  },
  contracts_directory: "./contracts",
  contracts_build_directory: "./build/contracts",
  migrations_directory: "./migrations",
  test_directory: "./test",
  db: { enabled: false },
};
