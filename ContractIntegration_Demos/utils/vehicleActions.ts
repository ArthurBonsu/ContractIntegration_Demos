import { Contracts, Wallet } from "./chain";
import deployments from "./deployments.json";
import { Receipt, formatTime, makeReceipt } from "./receipts";
import { Step, sendTx } from "./tx";

// Every call the vehicles page makes to the VehicleRegistry contract lives in this file,
// so the components only have to show things. Three kinds of call:
//   registerVehicle     a WRITE   changes the chain, costs gas, ends in a receipt
//   lookUpVehicle       a READ    free, no signature
//   recentRegistrations EVENTS    the contract's history of VehicleRegistered

export interface VehicleRecord {
  isRegistered: boolean;
  owner: string;
  registered: string; // the time it was registered, ready to show
}

export interface Registration {
  name: string;
  owner: string;
  blockNumber: number;
  time: string;
  txHash: string;
}

// WRITE: register a pseudonym for the connected account, then build the receipt.
export async function registerVehicle(
  contracts: Contracts,
  wallet: Wallet,
  name: string,
  onStep: (step: Step, txHash?: string) => void
): Promise<Receipt> {
  // 1. Send the transaction. sendTx estimates gas first, so a contract rule fails before any pop-up.
  const mined = await sendTx(contracts.registry.methods.registerVehicle(name), wallet.account, onStep);

  // 2. The contract emitted VehicleRegistered. The receipt is built from that event and the transaction.
  const event = mined.events?.VehicleRegistered?.returnValues;
  return makeReceipt(
    "Vehicle Registered",
    name,
    [["pseudonym", name], ["owner", event?.owner ?? wallet.account]],
    mined,
    event?.timestamp
  );
}

// READ: ask the contract about one pseudonym. Nothing is sent, so there is no gas and no signature.
export async function lookUpVehicle(contracts: Contracts, name: string): Promise<VehicleRecord> {
  const vehicle: any = await contracts.registry.methods.getVehicle(name).call();

  return {
    isRegistered: vehicle.isRegistered,
    owner: vehicle.owner,
    registered: vehicle.isRegistered ? formatTime(vehicle.registrationTime) : "—",
  };
}

// The block number this contract was deployed in (deployments.json), so we never search blocks before it exists.
function deployedAtBlock(chainId: string): number {
  const entry = (deployments as any)[chainId];

  return Number(entry?.VehicleRegistry?.startBlock ?? 0);
}

const BLOCKS_TO_SEARCH = 50_000; // free public servers refuse to search the whole chain at once

// EVENTS: the newest registrations, newest first.
export async function recentRegistrations(contracts: Contracts, wallet: Wallet, limit = 10): Promise<Registration[]> {
  const latest = Number(await wallet.web3.eth.getBlockNumber());
  const fromBlock = Math.max(deployedAtBlock(wallet.chainId), latest - BLOCKS_TO_SEARCH, 0);

  const events: any[] = await contracts.registry.getPastEvents("VehicleRegistered", { fromBlock, toBlock: "latest" });
  const newest = events.slice(-limit).reverse();

  const registrations: Registration[] = [];

  for (const event of newest) {
    const name = await nameOfRegistration(wallet, event.transactionHash);

    registrations.push({
      name,
      owner: event.returnValues.owner,
      blockNumber: Number(event.blockNumber),
      time: formatTime(event.returnValues.timestamp),
      txHash: event.transactionHash,
    });
  }

  return registrations;
}

// The event stores the pseudonym only as a hash (the contract marks it "indexed"), so the event cannot tell us the name.
// The name IS in the transaction that registered it: the input is the function id (4 bytes) followed by the name.
async function nameOfRegistration(wallet: Wallet, txHash: string): Promise<string> {
  try {
    const tx = await wallet.web3.eth.getTransaction(txHash);
    const input = String(tx.input);

    return wallet.web3.eth.abi.decodeParameter("string", "0x" + input.slice(10)) as string;
  } catch {
    return "(name not readable)";
  }
}
