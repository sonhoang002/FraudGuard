import { useEffect, useState } from "react";

import PendingTransactionTable from "../components/PendingTransactionTable";
import RequestStateMessage from "../components/RequestStateMessage";
import { getPendingTransactions } from "../api/transactionsApi";

function PendingReviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  let queueContent;

  useEffect(() => {
    const controller = new AbortController();
    async function fetchData() {
      try {
        const pendingTransactions = await getPendingTransactions({
          signal: controller.signal,
        });
        setTransactions(pendingTransactions);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, []);

  if (isLoading) {
    queueContent = (
      <RequestStateMessage message="Loading pending transactions..." />
    );
  } else if (error) {
    queueContent = (
      <RequestStateMessage message="Unable to load pending transactions. Please try again." />
    );
  } else if (transactions.length === 0) {
    queueContent = (
      <RequestStateMessage message="No pending transactions found." />
    );
  } else {
    queueContent = <PendingTransactionTable transactions={transactions} />;
  }

  return (
    <main className="pending-review-page">
      <header className="page-header">
        <p className="eyebrow">FraudGuard analyst workspace</p>
        <h1>Pending Review</h1>
        <p className="page-description">
          Review transactions that are waiting for a manual decision.
        </p>
      </header>
      <section className="queue-section" aria-labelledby="queue-heading">
        <div className="section-heading">
          <h2 id="queue-heading">Pending Transactions</h2>
          <p>Transactions requiring analyst attention</p>
        </div>
        {queueContent}
      </section>
    </main>
  );
}

export default PendingReviewPage;
