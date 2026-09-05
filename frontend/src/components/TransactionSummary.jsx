function TransactionSummary({
  isStatusUpdating,
  onResolveTransaction,
  transaction,
}) {
  const headingId = `transaction-summary-${transaction.transaction_id}`;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: transaction.currency,
  }).format(transaction.amount);
  const formattedOccurredAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(transaction.occurred_at));
  const formattedCreatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(transaction.created_at));

  return (
    <section className="transaction-summary" aria-labelledby={headingId}>
      <h2 id={headingId}>Transaction #{transaction.transaction_id}</h2>
      <dl className="transaction-summary-grid">
        <div className="summary-field">
          <dt>Transaction ID</dt>
          <dd>{transaction.transaction_id}</dd>
        </div>
        <div className="summary-field">
          <dt>Account ID</dt>
          <dd>{transaction.account_id}</dd>
        </div>
        <div className="summary-field">
          <dt>Username</dt>
          <dd>{transaction.username}</dd>
        </div>
        <div className="summary-field">
          <dt>Amount</dt>
          <dd>{formattedAmount}</dd>
        </div>
        <div className="summary-field">
          <dt>Currency</dt>
          <dd>{transaction.currency}</dd>
        </div>
        <div className="summary-field">
          <dt>Merchant</dt>
          <dd>{transaction.merchant ?? "Not provided"}</dd>
        </div>
        <div className="summary-field">
          <dt>Device</dt>
          <dd>{transaction.device ?? "Not provided"}</dd>
        </div>
        <div className="summary-field">
          <dt>Status</dt>
          <dd>{transaction.transaction_status}</dd>
        </div>
        <div className="summary-field">
          <dt>Occurred Time</dt>
          <dd>{formattedOccurredAt}</dd>
        </div>
        <div className="summary-field">
          <dt>Created/Stored Time</dt>
          <dd>{formattedCreatedAt}</dd>
        </div>
      </dl>

      {transaction.transaction_status === "PENDING" && (
        <div className="review-actions" aria-label="Manual review actions">
          <button
            className="review-button review-button-approve"
            type="button"
            disabled={isStatusUpdating}
            onClick={() => onResolveTransaction("COMPLETED")}
          >
            Approve transaction
          </button>
          <button
            className="review-button review-button-decline"
            type="button"
            disabled={isStatusUpdating}
            onClick={() => onResolveTransaction("DECLINED")}
          >
            Decline transaction
          </button>
        </div>
      )}
    </section>
  );
}

export default TransactionSummary;
