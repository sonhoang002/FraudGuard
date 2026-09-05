export async function getPendingTransactions({ signal }) {
  const response = await fetch("/api/transactions/pending", { signal });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch pending transactions. Status: ${response.status}`,
    );
  }
  return await response.json();
}

export async function getTransactionDetails(transactionId, { signal }) {
  const response = await fetch(`/api/transactions/${transactionId}`, {
    signal,
  });

  if (!response.ok) {
    const requestError = new Error(
      `Failed to fetch transaction details. Status: ${response.status}`,
    );

    requestError.status = response.status;

    throw requestError;
  }
  return await response.json();
}

export async function updateTransactionStatus(
  transactionId,
  transactionStatus,
  { signal },
) {
  const response = await fetch(`/api/transactions/${transactionId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transaction_status: transactionStatus }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json();
    const requestError = new Error(
      `Failed to update transaction status. Status: ${response.status}`,
    );

    requestError.status = response.status;
    requestError.body = errorBody;

    throw requestError;
  }

  return await response.json();
}
