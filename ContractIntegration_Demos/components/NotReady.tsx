import { useWallet } from "../context/WalletContext";

// Shown by a demo page until a wallet is connected and the contracts are found.
export default function NotReady() {
  const { problem, mode, connect, busy } = useWallet();
  return (
    <div className="card stack">
      <h2>Not ready yet</h2>
      <div className={`msg ${problem.startsWith("Connecting") ? "info" : "warn"}`}>{problem}</div>
      {mode === "metamask" && <div><button className="btn" onClick={connect} disabled={busy}>Connect Wallet</button></div>}
      <div className="muted">
        Local setup, in three terminals: <code>npm run chain</code>, then <code>npm run deploy:local</code>, then{" "}
        <code>npm run dev</code>.
      </div>
    </div>
  );
}
