function PendingTransactionRow({ onSelectTransaction, transaction }) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: transaction.currency,
  }).format(transaction.amount);
  const formattedOccurredAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(transaction.occurred_at));

  return (
    <tr>
      <td className="transaction-id">
        #{transaction.transaction_id}{" "}
        <button
          type="button"
          onClick={() => onSelectTransaction(transaction.transaction_id)}
        >
          View Details
        </button>
      </td>
      <td>{transaction.username}</td>
      <td className="amount-cell">{formattedAmount}</td>
      <td>{transaction.currency}</td>
      <td>{transaction.merchant ?? "Not provided"}</td>
      <td>
        <span className="status-badge">{transaction.transaction_status}</span>
      </td>
      <td className="date-cell">{formattedOccurredAt}</td>
    </tr>
  );
}

export default PendingTransactionRow;
