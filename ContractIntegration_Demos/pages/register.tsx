import { useEffect, useState } from "react";
import NotReady from "../components/NotReady";
import ReadBack from "../components/ReadBack";
import ReceiptCard from "../components/ReceiptCard";
import TxStatus from "../components/TxStatus";
import { useReady } from "../context/WalletContext";
import { useTransaction } from "../hooks/useTransaction";
import { Receipt, formatTime, makeReceipt } from "../utils/receipts";
import { sendTx } from "../utils/tx";

// DEMO 1 · Register a vehicle.  One input, one button, one receipt.
export default function RegisterPage() {
  const ready = useReady();
  const [pseudonym, setPseudonym] = useState("");
  const [readBack, setReadBack] = useState<[string, string][]>([]);
  const { tx, result, run, fail, busy } = useTransaction<Receipt>();

  useEffect(() => {
    setPseudonym("KA-" + Math.floor(1000 + Math.random() * 9000) + "-GH");
  }, []);

  if (!ready) {
    return <NotReady />;
  }

  const { wallet, contracts } = ready;

  async function register() {
    const name = pseudonym.trim();

    if (!name) {
      fail("A pseudonym cannot be empty.");
      return;
    }

    setReadBack([]);

    const receipt = await run(async (onStep) => {
      // 1. WRITE: ask the contract to register this pseudonym for the connected account.
      const mined = await sendTx(contracts.registry.methods.registerVehicle(name), wallet.account, onStep);

      // 2. RECEIPT: the contract emitted a VehicleRegistered event; read the details from it.
      const event = mined.events?.VehicleRegistered?.returnValues;
      return makeReceipt("Vehicle Registered", name, [["pseudonym", name], ["owner", event?.owner ?? wallet.account]], mined, event?.timestamp);
    });

    if (receipt) {
      // 3. READ BACK: ask the chain again to prove it agrees.
      const v: any = await contracts.registry.methods.getVehicle(name).call();
      setReadBack([
        ["getVehicle → isRegistered", String(v.isRegistered)],
        ["getVehicle → owner", v.owner],
        ["getVehicle → registered", formatTime(v.registrationTime)],
      ]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      register();
    }
  }

  return (
    <>
      <div className="hero">
        <h1>Demo 1: Register a vehicle</h1>
        <div className="muted">Calls <code>VehicleRegistry.registerVehicle(pseudonym)</code>. A write: it changes the chain, costs gas, and ends in a receipt.</div>
      </div>

      <div className="grid2">
        <div className="card stack">
          <div>
            <label className="lbl">Pseudonym</label>
            <div className="row">
              <input className="input" value={pseudonym} disabled={busy} onChange={(e) => setPseudonym(e.target.value)}
                onKeyDown={handleKeyDown} />
              <button className="btn" onClick={register} disabled={busy}>{busy ? "Working..." : "Register"}</button>
            </div>
          </div>
          <TxStatus tx={tx} successText="Registered on the chain." />
          {result && <ReceiptCard receipt={result} />}
          <ReadBack rows={readBack} />
        </div>

        <div className="card">
          <h2>What happens</h2>
          <ol className="muted" style={{ paddingLeft: 18 }}>
            <li>The page builds the call <code>registerVehicle("{pseudonym}")</code>.</li>
            <li>It estimates the gas first, so a contract rule fails before anything is sent.</li>
            <li>The account signs and sends the transaction.</li>
            <li>A block is mined; the contract emits <code>VehicleRegistered</code>.</li>
            <li>The page reads the event and the transaction and draws the receipt.</li>
            <li>It then reads <code>getVehicle</code> to confirm.</li>
          </ol>
          <p className="muted"><b>Try:</b> press Register twice with the same name. The contract refuses, and the page explains why.</p>
        </div>
      </div>
    </>
  );
}
