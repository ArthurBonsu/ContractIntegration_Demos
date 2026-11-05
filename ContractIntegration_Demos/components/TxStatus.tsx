import { TxState } from "../hooks/useTransaction";

const LABELS = ["1 Confirm", "2 Sent to the network", "3 Added to a block", "4 Receipt"];

// Each step is "done" once we are past it, "on" while we are in it, and plain before that.
function stepClass(index: number, currentStep: number): string {
  if (index < currentStep) {
    return "done";
  }

  if (index === currentStep) {
    return "on";
  }

  return "";
}

// Draws the pending, success and error screens of a write. (Idle draws nothing.)
export default function TxStatus({ tx, successText }: { tx: TxState; successText: string }) {
  if (tx.state === "error") {
    return <div className="msg err">{tx.message}</div>;
  }

  if (tx.state === "success") {
    return <div className="msg ok">{successText}</div>;
  }

  if (tx.state !== "pending") {
    return null;
  }

  return (
    <div className="stack">
      <div className="steps">
        {LABELS.map((label, i) => (
          <span key={label} className={`step ${stepClass(i, tx.step)}`}>{label}</span>
        ))}
      </div>
      {tx.txHash && <div className="muted">tx <code>{tx.txHash.slice(0, 20)}...</code></div>}
    </div>
  );
}
