const pool = require("./pool");

const {
  getPendingTransactions,
  getTransactionPredictionHistory,
} = require("./readQueries");

async function run() {
  try {
    const pendingTransactions = await getPendingTransactions("Customer1");
    const predictionHistory = await getTransactionPredictionHistory(4);

    const missingCustomerResults = await getPendingTransactions("Customer5");
    const injectionAttemptResults = await getPendingTransactions(
      "Customer1' OR '1' = '1",
    );
    const missingTransactionHistory =
      await getTransactionPredictionHistory(9999);

    console.log("Pending transactions:");
    console.table(pendingTransactions);

    console.log("Prediction history:");
    console.table(predictionHistory);

    console.log("Pending transactions(Missing):");
    console.table(missingCustomerResults);

    console.log("Pending transactions(Injection):");
    console.table(injectionAttemptResults);

    console.log("Prediction history(Missing):");
    console.table(missingTransactionHistory);

    await getTransactionPredictionHistory("not-a-number");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
