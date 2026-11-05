import { Receipt } from "../utils/receipts";

// The receipt: everything in it comes from the transaction and its event, not from a database.
export default function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <div className="receipt">
      <div className="head">
        <span>✔ {receipt.title}</span>
        <span>{receipt.subject}</span>
      </div>
      {receipt.rows.map(([label, value]) => (
        <div className="line" key={label}><span>{label}</span><code>{value}</code></div>
      ))}
      <div className="line"><span>block</span><span>#{receipt.blockNumber}</span></div>
      <div className="line"><span>gas used</span><span>{receipt.gasUsed.toLocaleString()}</span></div>
      <div className="line"><span>time</span><span>{receipt.time}</span></div>
      <div className="line"><span>tx hash</span><code>{receipt.txHash}</code></div>
    </div>
  );
}
