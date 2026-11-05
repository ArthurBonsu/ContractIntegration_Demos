import Link from "next/link";
import { useWallet } from "../context/WalletContext";
import { resolveAddresses } from "../utils/chain";

const short = (a?: string) => (a ? a.slice(0, 8) + "..." + a.slice(-6) : "not found");

export default function StartPage() {
  const { wallet, contracts, isAdmin, problem } = useWallet();
  const found = wallet ? resolveAddresses(wallet.chainId) : null;

  return (
    <>
      <div className="hero">
        <h1>Smart-contract integration: four demos</h1>
        <div className="muted">A Next.js page calls real contracts and shows the receipt that comes back.</div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          ["/register", "1 Register a vehicle", "VehicleRegistry.registerVehicle"],
          ["/revoke", "2 Revoke a vehicle", "RevocationManager: report, then process"],
          ["/license", "3 Issue a license", "LicenseRegistry.issueLicense"],
          ["/vehicles", "4 Vehicle registry page", "A page made of components: register, look up, recent"],
        ].map(([href, title, sub]) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ height: "100%" }}>
              <h2>{title}</h2>
              <div className="muted">{sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card stack">
        <h2>Setup check</h2>
        <table className="tbl">
          <tbody>
            <tr><td>Chain reachable</td><td><span className={`badge ${wallet ? "ok" : "bad"}`}>{wallet ? `yes (chain ${wallet.chainId})` : "no"}</span></td></tr>
            <tr><td>Contracts found on this chain</td><td><span className={`badge ${contracts ? "ok" : "bad"}`}>{contracts ? "yes" : "no"}</span></td></tr>
            <tr><td>Selected account is administrator</td><td>{isAdmin === null ? <span className="muted">unknown</span> : <span className={`badge ${isAdmin ? "ok" : "warn"}`}>{isAdmin ? "yes" : "no"}</span>}</td></tr>
            {found && (
              <>
                <tr><td>VehicleRegistry</td><td><code>{short(found.registry.value)}</code></td></tr>
                <tr><td>RevocationManager</td><td><code>{short(found.revocation.value)}</code></td></tr>
                <tr><td>LicenseRegistry</td><td><code>{short(found.license.value)}</code></td></tr>
              </>
            )}
          </tbody>
        </table>
        {problem && <div className="msg warn">{problem}</div>}
        <div className="muted">
          Not ready? In three terminals: <code>npm run chain</code>, <code>npm run deploy:local</code>, <code>npm run dev</code>.
          Account #0 deployed the contracts, so it is the administrator.
        </div>
      </div>

      <div className="card">
        <h2>The pattern behind all of them</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          <b>write</b> (a transaction the account signs) → <b>receipt</b> (built from the transaction and the contract's event)
          → <b>read back</b> (ask the chain again). The code for each demo is one page in <code>pages/</code>; the shared
          machinery is <code>utils/chain.ts</code> (connect, find addresses, build contracts) and <code>utils/tx.ts</code> (send and report progress).
        </p>
      </div>
    </>
  );
}
