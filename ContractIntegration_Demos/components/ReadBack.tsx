// After a write, ask the chain again. The receipt says "I did it"; this proves the chain agrees.
export default function ReadBack({ rows }: { rows: [string, string][] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ background: "#fafbfd" }}>
      <b>Read back from the chain</b>
      <div className="muted" style={{ marginBottom: 6 }}>A free read: no gas, no signature.</div>
      <table className="tbl">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}><td>{k}</td><td><code>{v}</code></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
