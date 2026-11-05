import { useWallet } from "../context/WalletContext";
import { CHAIN_NAMES } from "../utils/chain";

// The strip at the top of every page: where the data comes from, who is acting, and whether the contracts are found.
export default function ConnectionBar() {
  const { mode, setMode, wallet, contracts, isAdmin, busy, connect, selectAccount } = useWallet();

  // The text on the connect button depends on what is happening.
  let connectText = "Connect Wallet";

  if (busy) {
    connectText = "Connecting...";
  } else if (mode === "ganache") {
    connectText = "Retry";
  }

  return (
    <div className="route" style={{ background: "#fff", borderBottom: "1px solid var(--line)", fontFamily: "inherit", color: "var(--ink)" }}>
      <div className="container row between" style={{ gap: 14 }}>
        <div className="tabs">
          <button className={mode === "ganache" ? "on" : ""} onClick={() => setMode("ganache")}>Local Ganache</button>
          <button className={mode === "metamask" ? "on" : ""} onClick={() => setMode("metamask")}>MetaMask</button>
        </div>

        <div className="row">
          {!wallet && (
            <button className="btn small" onClick={connect} disabled={busy}>
              {connectText}
            </button>
          )}
          {wallet && (
            <>
              <span className="pill">{CHAIN_NAMES[wallet.chainId] ?? `chain ${wallet.chainId}`}</span>
              {wallet.mode === "ganache" ? (
                <select className="input" style={{ flex: "none", padding: "4px 8px", fontSize: ".85rem" }}
                  value={wallet.account} onChange={(e) => selectAccount(e.target.value)}>
                  {wallet.accounts.map((a, i) => (
                    <option key={a} value={a}>#{i} {a.slice(0, 6)}...{a.slice(-4)}</option>
                  ))}
                </select>
              ) : (
                <span className="pill">{wallet.account.slice(0, 6)}...{wallet.account.slice(-4)}</span>
              )}
              {isAdmin !== null && <span className={`badge ${isAdmin ? "ok" : "warn"}`}>{isAdmin ? "administrator" : "not administrator"}</span>}
              <span className={`badge ${contracts ? "ok" : "bad"}`}>{contracts ? "contracts found" : "contracts not found"}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
