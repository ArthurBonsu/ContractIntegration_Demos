import { useEffect, useState } from "react";
import ReadBack from "./ReadBack";
import { Contracts } from "../utils/chain";
import { friendlyError } from "../utils/errors";
import { lookUpVehicle } from "../utils/vehicleActions";

interface Props {
  contracts: Contracts;
  suggested: string; // a pseudonym the page wants looked up (the one just registered); "" for none
}

// Ask the contract about one pseudonym. A read: free, no wallet pop-up.
export default function LookUpVehicle({ contracts, suggested }: Props) {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<[string, string][]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function look(pseudonym: string) {
    if (!pseudonym.trim()) {
      setMessage("Type a pseudonym to look up.");
      return;
    }

    setBusy(true);
    setMessage("");
    setRows([]);

    try {
      const vehicle = await lookUpVehicle(contracts, pseudonym.trim());

      if (!vehicle.isRegistered) {
        setMessage(`"${pseudonym.trim()}" is not registered on this chain.`);
      } else {
        setRows([["isRegistered", "true"], ["owner", vehicle.owner], ["registered", vehicle.registered]]);
      }
    } catch (err) {
      setMessage(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  // When the page passes in a new suggestion, put it in the box and look it up straight away.
  useEffect(() => {
    if (!suggested) {
      return;
    }

    setName(suggested);
    look(suggested);
  }, [suggested]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      look(name);
    }
  }

  return (
    <div className="card stack">
      <h2>Look up a vehicle</h2>

      <div className="row">
        <input
          className="input"
          placeholder="pseudonym, for example KA-1234-GH"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn secondary" onClick={() => look(name)} disabled={busy}>
          {busy ? "Reading..." : "Look up"}
        </button>
      </div>

      {message && <div className="msg info">{message}</div>}

      <ReadBack rows={rows} />
    </div>
  );
}
