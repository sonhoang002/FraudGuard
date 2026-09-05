import { useEffect, useState } from "react";

import PendingTransactionTable from "../components/PendingTransactionTable";
import RequestStateMessage from "../components/RequestStateMessage";
import TransactionSummary from "../components/TransactionSummary";
import PredictionHistory from "../components/PredictionHistory";

import {
  getPendingTransactions,
  getTransactionDetails,
  updateTransactionStatus,
} from "../api/transactionsApi";

function PendingReviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState(null);

  let queueContent;
  let detailContent;

  function handleSelectTransaction(transactionId) {
    setSelectedTransactionId(transactionId);
    setStatusUpdateError(null);
  }

  async function handleTransactionStatus(nextStatus) {
    try {
      setStatusUpdateError(null);
      setIsStatusUpdating(true);
      const updatedTransaction = await updateTransactionStatus(
        selectedTransactionId,
        nextStatus,
        {},
      );
      setDetailTransaction({ ...detailTransaction, ...updatedTransaction });
      setTransactions((previousTransaction) => {
        return previousTransaction.filter(
          (transaction) =>
            transaction.transaction_id !== detailTransaction.transaction_id,
        );
      });
    } catch (error) {
      if (error.status === 409) {
        const currentStatus = error.body.current_status;
        setDetailTransaction((previousDetailTransaction) => ({
          ...previousDetailTransaction,
          transaction_status: currentStatus,
        }));
        setTransactions((previousTransaction) => {
          return previousTransaction.filter(
            (transaction) =>
              transaction.transaction_id !== selectedTransactionId,
          );
        });
      }
      setStatusUpdateError(error);
    } finally {
      setIsStatusUpdating(false);
    }
  }

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

  useEffect(() => {
    if (selectedTransactionId === null) {
      return;
    }

    const controller = new AbortController();

    async function fetchTransactionDetails() {
      try {
        setIsDetailLoading(true);
        setDetailTransaction(null);
        setDetailError(null);

        const transactionDetails = await getTransactionDetails(
          selectedTransactionId,
          { signal: controller.signal },
        );
        setDetailTransaction(transactionDetails);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setDetailError(requestError);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsDetailLoading(false);
        }
      }
    }

    fetchTransactionDetails();

    return () => {
      controller.abort();
    };
  }, [selectedTransactionId]);

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
    queueContent = (
      <PendingTransactionTable
        onSelectTransaction={handleSelectTransaction}
        transactions={transactions}
      />
    );
  }

  if (selectedTransactionId === null) {
    detailContent = null;
  } else if (isDetailLoading) {
    detailContent = (
      <RequestStateMessage message="Loading transaction details..." />
    );
  } else if (detailError) {
    if (detailError.status === 404) {
      detailContent = <RequestStateMessage message="Transaction not found." />;
    } else {
      detailContent = (
        <RequestStateMessage message="Unable to load transaction details. Please try again." />
      );
    }
  } else if (detailTransaction) {
    detailContent = (
      <>
        <TransactionSummary
          isStatusUpdating={isStatusUpdating}
          onResolveTransaction={handleTransactionStatus}
          transaction={detailTransaction}
        />
        {statusUpdateError &&
          (statusUpdateError.status === 409 ? (
            <RequestStateMessage
              message={`Transaction already resolved with the current status ${detailTransaction.transaction_status}`}
            />
          ) : (
            <RequestStateMessage
              message={"Unable to update transaction status. Please try again."}
            />
          ))}
        <PredictionHistory
          predictions={detailTransaction.predictions}
        ></PredictionHistory>
      </>
    );
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
      {detailContent}
    </main>
  );
}

export default PendingReviewPage;
