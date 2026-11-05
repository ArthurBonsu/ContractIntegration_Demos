import { useState } from "react";
import { friendlyError } from "../utils/errors";
import { Step } from "../utils/tx";

// One write has exactly four possible screens: idle, pending, success, error.
export type TxState =
  | { state: "idle" }
  | { state: "pending"; step: 0 | 1 | 2; txHash?: string }
  | { state: "success" }
  | { state: "error"; message: string };

const STEP_INDEX: Record<Step, 0 | 1 | 2> = { wallet: 0, sent: 1, mined: 2 };

export function useTransaction<T>() {
  const [tx, setTx] = useState<TxState>({ state: "idle" });
  const [result, setResult] = useState<T | null>(null);

  async function run(work: (onStep: (s: Step, hash?: string) => void) => Promise<T>): Promise<T | null> {
    setTx({ state: "pending", step: 0 });
    setResult(null);
    try {
      const value = await work((s, hash) => setTx({ state: "pending", step: STEP_INDEX[s], txHash: hash }));
      setResult(value);
      setTx({ state: "success" });
      return value;
    } catch (err) {
      setTx({ state: "error", message: friendlyError(err) });
      return null;
    }
  }

  const fail = (message: string) => setTx({ state: "error", message });
  return { tx, result, run, fail, busy: tx.state === "pending" };
}
