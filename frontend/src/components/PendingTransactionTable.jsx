import PendingTransactionRow from "./PendingTransactionRow";

function PendingTransactionTable({ transactions }) {
  return (
    <div
      className="transaction-table-wrapper"
      role="region"
      aria-labelledby="queue-heading"
      tabIndex="0"
    >
      <table className="transaction-table">
        <thead>
          <tr>
            <th scope="col">Transaction ID</th>
            <th scope="col">Username</th>
            <th scope="col">Amount</th>
            <th scope="col">Currency</th>
            <th scope="col">Merchant</th>
            <th scope="col">Status</th>
            <th scope="col">Occurred at</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <PendingTransactionRow
              key={transaction.transaction_id}
              transaction={transaction}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PendingTransactionTable;
