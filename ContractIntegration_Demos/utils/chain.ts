import Web3 from "web3";
import abi from "./abi.json";
import deployments from "./deployments.json";
import chains from "@/shared/chains.json";
import { Addresses, envAddresses } from "./config";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export type Mode = "ganache" | "metamask";

export interface Wallet {
  mode: Mode;
  web3: Web3;
  account: string;
  accounts: string[];
  chainId: string;
}

// Where the local Ganache chain listens (the `npm run chain` script uses the same port).
export const GANACHE_URL = process.env.NEXT_PUBLIC_GANACHE_URL || "http://127.0.0.1:7545";

export const CHAIN_NAMES: Record<string, string> = {
  "1337": "Ganache (local)",
  "5777": "Ganache (local)",
  ...Object.fromEntries(chains.chains.map((c) => [String(c.chainId), c.name])),
};

// STEP 1a: connect to the local Ganache chain directly. Its accounts are unlocked, so no wallet extension is needed.
export async function connectGanache(index = 0): Promise<Wallet> {
  const web3 = new Web3(GANACHE_URL);
  let accounts: string[];
  try {
    accounts = await web3.eth.getAccounts();
  } catch {
    throw new Error(`Cannot reach Ganache at ${GANACHE_URL}. Start it with "npm run chain" in another terminal.`);
  }

  if (!accounts.length) {
    throw new Error("Ganache has no accounts.");
  }

  const chainId = (await web3.eth.getChainId()).toString();
  return { mode: "ganache", web3, account: accounts[Math.min(index, accounts.length - 1)], accounts, chainId };
}

// STEP 1b: connect the browser wallet (MetaMask). The wallet signs; the page never sees a private key.
export async function connectMetaMask(): Promise<Wallet> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No browser wallet found. Install MetaMask, or use the local Ganache option.");
  }
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const web3 = new Web3(window.ethereum);
  const accounts = await web3.eth.getAccounts();
  const chainId = (await web3.eth.getChainId()).toString();
  return { mode: "metamask", web3, account: accounts[0], accounts, chainId };
}

// deployments.json has the main project's shape: { "<chainId>": { VehicleRegistry: { address }, ... } }.
type Names = "VehicleRegistry" | "RevocationManager" | "LicenseRegistry";
type Deployment = Partial<Record<Names, { address?: string }>>;
const DEPLOYED = deployments as unknown as Record<string, Deployment>;

// STEP 2: find the contract addresses for THIS chain. The environment file wins; then deployments.json
// (written by `npm run deploy:local`).
export function resolveAddresses(chainId: string) {
  const fromEnv = envAddresses(chainId);
  const fromFile = DEPLOYED[chainId] ?? {};
  const pick = (key: keyof Addresses, name: Names) => ({
    value: fromEnv[key] ?? fromFile[name]?.address,
  });
  return { registry: pick("registry", "VehicleRegistry"), revocation: pick("revocation", "RevocationManager"), license: pick("license", "LicenseRegistry") };
}

// STEP 3: one contract object per deployed contract. Calling its methods is how the page talks to the chain.
export function contractsFor(wallet: Wallet) {
  const found = resolveAddresses(wallet.chainId);
  const need = (name: string, v: { value?: string }) => {
    if (!v.value) {
      throw new Error(
        `The contracts are not deployed on ${CHAIN_NAMES[wallet.chainId] ?? "chain " + wallet.chainId}. ` +
          `Run "npm run deploy:local" (with Ganache running) or switch to a chain listed in utils/deployments.json.`
      );
    }
    return v.value;
  };
  const { web3 } = wallet;
  return {
    registry: new web3.eth.Contract(abi.VehicleRegistry as any, need("VehicleRegistry", found.registry)),
    revocation: new web3.eth.Contract(abi.RevocationManager as any, need("RevocationManager", found.revocation)),
    license: new web3.eth.Contract(abi.LicenseRegistry as any, need("LicenseRegistry", found.license)),
  };
}

export type Contracts = ReturnType<typeof contractsFor>;
