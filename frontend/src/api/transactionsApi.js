export async function getPendingTransactions({ signal }) {
  const response = await fetch("/api/transactions/pending", { signal });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch pending transactions. Status: ${response.status}`,
    );
  }
  return await response.json();
}
