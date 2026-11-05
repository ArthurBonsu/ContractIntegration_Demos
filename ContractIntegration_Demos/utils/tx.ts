// Sends one transaction and reports its progress. Every write in the demos goes through here.
export type Step = "wallet" | "sent" | "mined";

export async function sendTx(
  method: any,                              // e.g. contracts.registry.methods.registerVehicle("KA-1")
  from: string,
  onStep: (step: Step, txHash?: string) => void
): Promise<any> {
  // Estimating first makes a contract rule (for example "already registered") fail BEFORE any
  // wallet pop-up, and with the contract's own reason.
  const estimate: bigint = await method.estimateGas({ from });
  onStep("wallet");

  const pending = method.send({ from, gas: String((estimate * 12n) / 10n) });
  pending.on("transactionHash", (hash: string) => onStep("sent", hash));
  const receipt = await pending;
  onStep("mined");
  return receipt;
}
