import { useEffect, useState } from "react";
import NotReady from "../components/NotReady";
import ReadBack from "../components/ReadBack";
import ReceiptCard from "../components/ReceiptCard";
import TxStatus from "../components/TxStatus";
import { useReady } from "../context/WalletContext";
import { useTransaction } from "../hooks/useTransaction";
import { Receipt, formatTime, makeReceipt } from "../utils/receipts";
import { sendTx } from "../utils/tx";

const TYPES = ["Class A (motorcycle)", "Class B (car)", "Class C (light truck)", "Commercial"];

// DEMO 3 · Issue a license.  The contract checks that the vehicle is registered and not revoked.
export default function LicensePage() {
  const ready = useReady();
  const [licenseId, setLicenseId] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [type, setType] = useState(TYPES[1]);
  const [days, setDays] = useState("365");
  const [readBack, setReadBack] = useState<[string, string][]>([]);
  const { tx, result, run, fail, busy } = useTransaction<Receipt>();

  useEffect(() => {
    setLicenseId("LIC-" + Math.floor(10000 + Math.random() * 90000));
  }, []);

  // Pre-fill the vehicle with the latest one registered by this account (a free read).
  const account = ready?.wallet.account;
  const registry = ready?.contracts.registry;
  useEffect(() => {
    if (!registry || !account) {
      return;
    }

    const vehicleRegistry = registry;
    const owner = account;

    async function fillInLatestVehicle() {
      try {
        const name: string = await vehicleRegistry.methods.ownerToPseudonym(owner).call();

        if (name) {
          setVehicle(name);
        }
      } catch {
        // There is nothing to suggest, so the box stays empty.
      }
    }

    fillInLatestVehicle();
  }, [registry, account]);

  if (!ready) {
    return <NotReady />;
  }

  const { wallet, contracts } = ready;

  async function issue() {
    const id = licenseId.trim();
    const vehicleName = vehicle.trim();

    if (!id || !vehicleName) {
      fail("A license number and a vehicle are required.");
      return;
    }

    if (!(Number(days) > 0)) {
      fail("Validity must be a number of days above zero.");
      return;
    }

    setReadBack([]);

    const receipt = await run(async (onStep) => {
      const mined = await sendTx(contracts.license.methods.issueLicense(id, vehicleName, type, days), wallet.account, onStep);
      const ev = mined.events?.LicenseIssued?.returnValues;
      return makeReceipt("License Issued", id,
        [["vehicle", vehicleName], ["type", type], ["expires", ev ? formatTime(ev.expiryTime) : "—"]], mined, ev?.issueTime);
    });

    if (receipt) {
      const valid: boolean = await contracts.license.methods.isLicenseValid(id).call();
      const total = await contracts.license.methods.licenseCount().call();
      setReadBack([["isLicenseValid", String(valid)], ["licenseCount", String(total)]]);
    }
  }

  return (
    <>
      <div className="hero">
        <h1>Demo 3: Issue a license</h1>
        <div className="muted">Calls <code>LicenseRegistry.issueLicense(...)</code>. Another contract's data (the registry and the revocation list) decides if it is allowed.</div>
      </div>

      <div className="grid2">
        <div className="card stack">
          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="lbl">License number</label>
              <input className="input" style={{ width: "100%" }} value={licenseId} onChange={(e) => setLicenseId(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl">Vehicle (registered pseudonym)</label>
              <input className="input" style={{ width: "100%" }} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="register one in Demo 1" />
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label className="lbl">Type</label>
              <select className="input" style={{ width: "100%" }} value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl">Valid for (days)</label>
              <input className="input" style={{ width: "100%" }} value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
          </div>
          <div><button className="btn" onClick={issue} disabled={busy}>{busy ? "Working..." : "Issue license"}</button></div>
          <TxStatus tx={tx} successText="License issued on the chain." />
          {result && <ReceiptCard receipt={result} />}
          <ReadBack rows={readBack} />
        </div>

        <div className="card">
          <h2>What the contract checks</h2>
          <ol className="muted" style={{ paddingLeft: 18 }}>
            <li>The vehicle is registered (asks <code>VehicleRegistry</code>).</li>
            <li>The vehicle is not revoked (asks <code>RevocationManager</code>).</li>
            <li>The license number has not been used before.</li>
          </ol>
          <p className="muted">
            <b>Try:</b> issue a license for a vehicle that does not exist, then for one you revoked in Demo 2. Each
            failure is caught by the contract, and the page shows the reason.
          </p>
        </div>
      </div>
    </>
  );
}
