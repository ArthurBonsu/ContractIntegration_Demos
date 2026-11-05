// A receipt is built from what the transaction itself returned: its hash, the block it was mined in,
// the gas it used, and the event the contract emitted. Nothing is stored anywhere else.
export interface Receipt {
  title: string;                 // what happened, e.g. "Vehicle Registered"
  subject: string;               // who or what it happened to
  rows: [string, string][];      // the details from the contract's event
  blockNumber: number;
  gasUsed: number;
  txHash: string;
  time: string;
}

export function formatTime(seconds: bigint | number | string): string {
  return new Date(Number(seconds) * 1000).toLocaleString();
}

export function makeReceipt(
  title: string,
  subject: string,
  rows: [string, string][],
  tx: any,
  eventTimestamp?: bigint | number | string
): Receipt {
  return {
    title,
    subject,
    rows,
    blockNumber: Number(tx.blockNumber),
    gasUsed: Number(tx.gasUsed),
    txHash: String(tx.transactionHash),
    time: eventTimestamp !== undefined ? formatTime(eventTimestamp) : new Date().toLocaleString(),
  };
}
