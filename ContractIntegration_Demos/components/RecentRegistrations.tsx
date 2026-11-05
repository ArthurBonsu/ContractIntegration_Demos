import { useEffect, useState } from "react";
import { Contracts, Wallet } from "../utils/chain";
import { friendlyError } from "../utils/errors";
import { Registration, recentRegistrations } from "../utils/vehicleActions";

interface Props {
  wallet: Wallet;
  contracts: Contracts;
  refreshKey: number; // the page adds 1 after each new registration, which makes this list load again
}

// The contract's history: every time it emitted VehicleRegistered, newest first.
export default function RecentRegistrations({ wallet, contracts, refreshKey }: Props) {
  const [items, setItems] = useState<Registration[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      setItems(await recentRegistrations(contracts, wallet));
    } catch (err) {
      setItems([]);
      setMessage(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // Load the list when the page first shows it, and again each time the page changes refreshKey.
  useEffect(() => {
    load();
  }, [contracts, refreshKey]);

  return (
    <div className="card">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Recent registrations</h2>
        <button className="btn secondary small" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      <div className="muted" style={{ margin: "6px 0 10px" }}>Read from the contract's events. Newest first.</div>

      {message && <div className="msg warn">{message}</div>}
      {!message && !loading && items.length === 0 && <div className="muted">Nothing registered yet. Register a vehicle on the left.</div>}

      {items.map((item) => (
        <div className="vcard" key={item.txHash}>
          <div className="name">{item.name}</div>
          <div className="muted">
            owner <code>{item.owner.slice(0, 8)}...{item.owner.slice(-6)}</code> · block #{item.blockNumber} · {item.time}
          </div>
        </div>
      ))}
    </div>
  );
}
