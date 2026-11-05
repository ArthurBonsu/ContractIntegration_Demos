import { useEffect, useState } from "react";
import NotReady from "../components/NotReady";
import ReadBack from "../components/ReadBack";
import ReceiptCard from "../components/ReceiptCard";
import TxStatus from "../components/TxStatus";
import { useReady } from "../context/WalletContext";
import { useTransaction } from "../hooks/useTransaction";
import { Receipt, formatTime, makeReceipt } from "../utils/receipts";
import { sendTx } from "../utils/tx";

// DEMO 2 · Revoke a vehicle.  Three small steps: prepare two vehicles, report one, process the report.
export default function RevokePage() {
  const ready = useReady();
  const [offender, setOffender] = useState("");
  const [reporter, setReporter] = useState("");
  const [reason, setReason] = useState("Ran a red light");
  const [reportId, setReportId] = useState("");
  const [reportRead, setReportRead] = useState<[string, string][]>([]);
  const [revokeRead, setRevokeRead] = useState<[string, string][]>([]);

  const prep = useTransaction<Receipt[]>();
  const report = useTransaction<Receipt>();
  const process = useTransaction<Receipt>();

  useEffect(() => {
    const n = Math.floor(1000 + Math.random() * 9000);
    setOffender("OFFENDER-" + n);
    setReporter("REPORTER-" + n);
  }, []);

  if (!ready) {
    return <NotReady />;
  }

  const { wallet, contracts, isAdmin } = ready;

  // STEP 0 · optional helper: a report needs two registered vehicles, so register both.
  async function prepare() {
    await prep.run(async (onStep) => {
      const receipts: Receipt[] = [];
      for (const name of [offender.trim(), reporter.trim()]) {
        const mined = await sendTx(contracts.registry.methods.registerVehicle(name), wallet.account, onStep);
        const ev = mined.events?.VehicleRegistered?.returnValues;
        receipts.push(makeReceipt("Vehicle Registered", name, [["owner", ev?.owner ?? wallet.account]], mined, ev?.timestamp));
      }
      return receipts;
    });
  }

  // STEP 1 · anyone can report; the contract checks both vehicles exist and that the reason is not empty.
  async function submitReport() {
    setReportRead([]);
    const offenderName = offender.trim();
    const reporterName = reporter.trim();
    const receipt = await report.run(async (onStep) => {
      const mined = await sendTx(contracts.revocation.methods.submitRevocationReport(offenderName, reporterName, reason.trim()), wallet.account, onStep);
      const ev = mined.events?.ReportSubmitted?.returnValues;

      if (ev) {
        setReportId(String(ev.reportId));
      }

      return makeReceipt("Report Submitted", `report #${ev?.reportId ?? "?"}`,
        [["offender", offenderName], ["reporter", reporterName], ["reason", reason.trim()]], mined, ev?.timestamp);
    });
    if (receipt && receipt.subject.startsWith("report #")) {
      const id = receipt.subject.slice(8);
      const rep: any = await contracts.revocation.methods.getReport(id).call();
      setReportRead([["getReport → offender", rep.offender], ["getReport → processed", String(rep.processed)]]);
    }
  }

  // STEP 2 · only the administrator can turn a report into a revocation.
  async function processReport() {
    setRevokeRead([]);
    const id = reportId.trim();

    if (!id) {
      process.fail("Enter a report number (Step 1 fills it in).");
      return;
    }

    // The contract would refuse a non-administrator anyway; checking first gives a clearer message.
    if (isAdmin === false) {
      process.fail("Only the administrator (the account that deployed the contracts) can revoke. Pick that account in the bar above.");
      return;
    }
    const receipt = await process.run(async (onStep) => {
      const mined = await sendTx(contracts.revocation.methods.processRevocation(id), wallet.account, onStep);
      const ev = mined.events?.VehicleRevoked?.returnValues;
      return makeReceipt("Vehicle Revoked", String(ev?.pseudonym ?? offender), [["reason", String(ev?.reason ?? "")], ["report", "#" + id]], mined, ev?.timestamp);
    });
    if (receipt) {
      const name = receipt.subject;
      const revoked: boolean = await contracts.revocation.methods.isRevoked(name).call();
      const d: any = await contracts.revocation.methods.getRevocationDetails(name).call();
      setRevokeRead([["isRevoked", String(revoked)], ["revoked at", formatTime(d.revocationTime)], ["reason on chain", d.reason]]);
    }
  }

  return (
    <>
      <div className="hero">
        <h1>Demo 2: Revoke a vehicle</h1>
        <div className="muted">
          Two contract calls: <code>submitRevocationReport</code> (anyone) then <code>processRevocation</code> (administrator only).
        </div>
      </div>

      <div className="card stack">
        <h2><span className="num">0</span>Prepare two vehicles</h2>
        <div className="row">
          <input className="input" value={offender} onChange={(e) => setOffender(e.target.value)} placeholder="offender" />
          <input className="input" value={reporter} onChange={(e) => setReporter(e.target.value)} placeholder="reporter" />
          <button className="btn secondary" onClick={prepare} disabled={prep.busy}>{prep.busy ? "Working..." : "Register both"}</button>
        </div>
        <TxStatus tx={prep.tx} successText="Both vehicles registered. Now report the offender." />
        {prep.result?.map((r) => <ReceiptCard key={r.txHash} receipt={r} />)}
        <div className="muted">Skip this step if both vehicles are already registered.</div>
      </div>

      <div className="grid2">
        <div className="card stack">
          <h2><span className="num">1</span>Report the offender</h2>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason" />
          <div><button className="btn" onClick={submitReport} disabled={report.busy}>{report.busy ? "Working..." : "Submit report"}</button></div>
          <TxStatus tx={report.tx} successText="Report recorded on the chain. Nothing is revoked yet." />
          {report.result && <ReceiptCard receipt={report.result} />}
          <ReadBack rows={reportRead} />
        </div>

        <div className="card stack">
          <h2><span className="num">2</span>Process the report</h2>
          {isAdmin === false && (
            <div className="msg warn">The selected account is not the administrator. Pick the administrator (account #0 on Ganache) in the bar above.</div>
          )}
          <div className="row">
            <input className="input" value={reportId} onChange={(e) => setReportId(e.target.value)} placeholder="report number" />
            <button className="btn danger" onClick={processReport} disabled={process.busy}>{process.busy ? "Working..." : "Revoke"}</button>
          </div>
          <TxStatus tx={process.tx} successText="The vehicle is now revoked." />
          {process.result && <ReceiptCard receipt={process.result} />}
          <ReadBack rows={revokeRead} />
        </div>
      </div>
    </>
  );
}
