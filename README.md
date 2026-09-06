# FraudGuard

FraudGuard is a learning-first portfolio project for a real-time fraud detection and decisioning platform. It is being built in roughly 40 days to demonstrate practical backend engineering, PostgreSQL design, machine-learning integration, and explainable business decisions.

## Current Progress

Days 1-13 are complete:

- Designed a PostgreSQL schema for users, accounts, transactions, and fraud predictions.
- Added foreign keys, indexes, and database constraints for data integrity.
- Kept immutable transaction events separate from historical fraud predictions.
- Inserted sample data inside a database transaction.
- Validated unique, check, and foreign-key constraints with intentionally invalid data.
- Added parameterized read queries for pending transactions, transaction details, and prediction history.
- Added Express health, pending-review queue, transaction-detail, and prediction-history endpoints.
- Added `POST /api/transactions` with strict request validation and a parameterized PostgreSQL insert.
- Kept transaction status backend-owned and initialized new transactions as `PENDING`.
- Added an atomic manual-review status workflow for resolving pending transactions to `COMPLETED` or `DECLINED`.
- Added 84 Jest/Supertest and query-layer cases covering success, validation, empty results, state conflicts, 404s, parameterization, and database failures.
- Verified transaction creation, manual review, pending reads, and transaction details against local PostgreSQL.
- Added a React/Vite analyst dashboard that fetches the live pending-review queue through a development proxy.
- Added loading, empty, error, and populated states with request cancellation during component cleanup.
- Added reusable queue components, localized currency/date display, and a responsive accessible table layout.
- Added transaction-detail, prediction-history, approval/decline, and stale-client conflict-reconciliation workflows.
- Added 7 Vitest/React Testing Library behavior tests for queue states and the core analyst workflow.
- Established the Python/pandas environment and completed a Ruff-verified transaction-analysis exercise covering DataFrames, missing values, filtering, aggregation, and vectorized features.

## Current API

- `GET /health` checks whether the Express application is responding.
- `GET /api/transactions/pending` returns the all-customer pending-review queue.
- `GET /api/transactions/pending?username=Customer1` optionally filters that queue by customer.
- `GET /api/transactions/:transactionId` returns one transaction with nested prediction history.
- `GET /api/transactions/:transactionId/predictions` returns the standalone prediction-history collection.
- `POST /api/transactions` creates a transaction with backend-owned initial `PENDING` status.
- `PATCH /api/transactions/:transactionId/status` resolves a pending transaction to `COMPLETED` or `DECLINED`.

The transaction-detail endpoint returns `200` with `predictions: []` when a transaction exists without predictions, `404` when the transaction does not exist, and `400` for an invalid ID. Unexpected failures use the generic `500` response without exposing database details.

## Planned Architecture

```text
React analyst dashboard
          |
          v
Node.js / Express API ----> PostgreSQL
          |
          v
Python FastAPI ML service
          |
          v
Fraud probability
          |
          v
Node decision engine: APPROVE | REVIEW | BLOCK
```

The machine-learning service will estimate risk. The Node.js backend will own the business rules that turn a risk score into an operational decision.

## Database Model

```text
users 1 ----< accounts 1 ----< transactions 1 ----< fraud_predictions
```

- A transaction records what happened.
- A fraud prediction records what the system concluded about that transaction.
- Predictions are historical: a transaction can have multiple scores from different model versions.
- Transaction details are immutable after creation; only `transaction_status` can change.

## Local Setup

Prerequisites:

- Node.js
- PostgreSQL
- Python 3.14

1. Install the backend dependencies from the repository root:

   ```bash
   npm install
   ```

2. Install the frontend dependencies:

   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. Create and activate the Python environment, then install its dependencies:

   ```powershell
   cd ml_service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   cd ..
   ```

4. Create a local PostgreSQL database named `fraudguard`.

5. Create a `.env` file from `.env.example` and set your local PostgreSQL password.

6. Run `database/schema.sql` against the `fraudguard` database using your preferred PostgreSQL client.

7. Insert the sample records:

   ```bash
   npm run seed
   ```

Run the seed script against an empty database. It uses a fixed sample username, so a second run will correctly fail the database's unique-username constraint.

Start Express from the repository root:

```bash
npm run dev
```

In a second terminal, start Vite:

```bash
cd frontend
npm run dev
```

During local development, Vite forwards relative `/api` requests to Express on port `3000`.

`database/validation.sql` contains intentionally invalid statements for manually testing database constraints. Run them one at a time; each is expected to fail.

## Project Structure

```text
database/
  schema.sql         PostgreSQL tables, constraints, and indexes
  queries.js         Sample data insertion script
  validation.sql     Intentional constraint failures and join practice
  pool.js            PostgreSQL connection pool
  readQueries.js     Parameterized application reads
  writeQueries.js    Parameterized transaction creation and status updates
src/
  app.js             Express configuration
  server.js          Network startup
  controllers/       HTTP validation and responses
  routes/            API route definitions
  services/          Multi-query workflows and business outcomes
  middleware/        JSON 404 and 500 handlers
  test/              Jest/Supertest integration and query-layer tests
frontend/
  src/api/           Browser API functions
  src/components/    Reusable queue presentation components
  src/pages/         Page-level request state and composition
  vite.config.js     React plugin and local API proxy configuration
ml_service/
  requirements.txt   Exact Python environment dependencies
  transaction_practice.py  Day 13 pandas foundations exercise
```

## V1 Stack

- React with JavaScript
- Node.js and Express
- PostgreSQL with `pg`
- Python, pandas, NumPy, and scikit-learn
- FastAPI
- Docker

## Security Note

Never commit `.env` files, database passwords, or real credentials. `.env.example` documents the required variable without containing a secret.

## Roadmap

- Days 1-4: Architecture and PostgreSQL
- Days 5-9: Express backend
- Days 10-12: React analyst dashboard
- Days 13-18: Python and pandas foundations
- Days 19-24: Machine learning
- Days 25-33: FastAPI inference, decision engine, and explainability
- Days 34-40: Testing, Docker, deployment, and documentation
