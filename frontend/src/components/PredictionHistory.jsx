function PredictionHistory({ predictions }) {
  let predictionContent;

  if (predictions.length === 0) {
    predictionContent = (
      <p className="prediction-empty">
        No prediction history is available for this transaction.
      </p>
    );
  } else {
    predictionContent = (
      <div
        className="prediction-table-wrapper"
        role="region"
        aria-label="Prediction history table"
        tabIndex="0"
      >
        <table className="prediction-table">
          <thead>
            <tr>
              <th scope="col">Prediction ID</th>
              <th scope="col">Model version</th>
              <th scope="col">Fraud probability</th>
              <th scope="col">Decision</th>
              <th scope="col">Created time</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => {
              const formattedProbability = new Intl.NumberFormat("en-US", {
                style: "percent",
                maximumFractionDigits: 2,
              }).format(prediction.score_probability);
              const formattedCreatedAt = new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(prediction.prediction_created_at));

              return (
                <tr key={prediction.prediction_id}>
                  <td className="prediction-id">
                    {prediction.prediction_id}
                  </td>
                  <td>{prediction.model_version}</td>
                  <td className="probability-cell">{formattedProbability}</td>
                  <td>
                    <span
                      className={`decision-badge decision-${prediction.decision.toLowerCase()}`}
                    >
                      {prediction.decision}
                    </span>
                  </td>
                  <td className="date-cell">{formattedCreatedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section
      className="prediction-history"
      aria-labelledby="prediction-history-heading"
    >
      <h2 id="prediction-history-heading">Prediction History</h2>
      {predictionContent}
    </section>
  );
}

export default PredictionHistory;
