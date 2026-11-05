import { useEffect, useState } from "react";
import ReceiptCard from "./ReceiptCard";
import TxStatus from "./TxStatus";
import { useTransaction } from "../hooks/useTransaction";
import { Contracts, Wallet } from "../utils/chain";
import { Receipt } from "../utils/receipts";
import { registerVehicle } from "../utils/vehicleActions";

interface Props {
  wallet: Wallet;
  contracts: Contracts;
  onRegistered: (name: string) => void; // called once the chain has accepted the registration
}

// The registration form: one input, one button, and the receipt that comes back.
export default function RegisterVehicleForm({ wallet, contracts, onRegistered }: Props) {
  const [name, setName] = useState("");
  const { tx, result, run, fail, busy } = useTransaction<Receipt>();

  // A suggestion to start with. It is set after the page loads so the server and browser agree.
  useEffect(() => {
    setName("KA-" + Math.floor(1000 + Math.random() * 9000) + "-GH");
  }, []);

  async function handleRegister() {
    const pseudonym = name.trim();

    if (!pseudonym) {
      fail("A pseudonym cannot be empty.");
      return;
    }

    const receipt = await run((onStep) => registerVehicle(contracts, wallet, pseudonym, onStep));

    if (receipt) {
      onRegistered(pseudonym);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleRegister();
    }
  }

  return (
    <div className="card stack">
      <h2>Register a vehicle</h2>

      <div className="row">
        <input
          className="input"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn" onClick={handleRegister} disabled={busy}>
          {busy ? "Working..." : "Register"}
        </button>
      </div>

      <TxStatus tx={tx} successText="Registered on the chain." />

      {result && <ReceiptCard receipt={result} />}
    </div>
  );
}
