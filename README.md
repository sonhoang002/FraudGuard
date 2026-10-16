# FraudGuard

FraudGuard is a learning-first, end-to-end fraud scoring and decisioning platform. It combines a React analyst dashboard, a Node.js/Express API, PostgreSQL audit history, and a Python/FastAPI machine-learning service.

The project is implemented through Day 36 of a roughly 40-day roadmap. The core application, model-backed scoring flow, failure handling, explainability, decision-policy auditability, current-schema seed reliability, standalone service images, and PostgreSQL/Express/FastAPI Docker Compose stack are complete. Frontend containerization, deployment, authentication, and final portfolio polish are not yet complete.

## What FraudGuard Does

- Stores financial transactions in PostgreSQL.
- Sends transaction amount and merchant category to a versioned FastAPI model.
- Converts the model score into an operational `APPROVE`, `REVIEW`, or `BLOCK` decision in Node.js.
- Preserves append-only prediction history with both model and decision-policy versions.
- Keeps transactions pending for manual review when automatic scoring cannot complete.
- Gives analysts a responsive queue, transaction details, prediction history, decision explanations, and approve/decline controls.
- Handles stale manual-review attempts with an atomic pending-only update and `409 Conflict` reconciliation.

## Implemented Architecture

```text
React analyst dashboard
          |
          v
Node.js / Express API
          |
          +----------> PostgreSQL
          |
          +----------> Python FastAPI ML service
                              |
                              v
                    BankSim logistic pipeline
                              |
                              v
                       fraud risk score
                              |
                              v
                   Node decision policy
                    /       |       \
               APPROVE   REVIEW   BLOCK
```

Responsibility boundaries:

- **React** presents backend data and analyst actions. It does not recalculate fraud decisions.
- **Express** validates requests, orchestrates persistence and scoring, owns business thresholds, and shapes public API responses.
- **PostgreSQL** stores users, accounts, immutable transaction facts, and append-only prediction history.
- **FastAPI** loads the persisted scikit-learn pipeline and returns a score plus model version.
- **The model** ranks synthetic fraud risk; it does not choose the business action.

## Automatic Decision Policy

The current policy version is `fraud_thresholds_v1`.

| Score range | Decision | Transaction status |
| --- | --- | --- |
| `0.00 <= score < 0.50` | `APPROVE` | `COMPLETED` |
| `0.50 <= score < 0.90` | `REVIEW` | `PENDING` |
| `0.90 <= score <= 1.00` | `BLOCK` | `DECLINED` |

These are educational operating thresholds. The score comes from a synthetic-data model and is a ranking signal, not a calibrated real-world fraud probability.

### Scoring failure behavior

The transaction is stored before FraudGuard calls FastAPI. If the ML service times out, is unavailable, returns a non-successful response, or returns invalid data:

- the API still returns `201 Created` because the transaction was saved;
- the transaction remains `PENDING` for manual review;
- no fraud-prediction row is created because no valid model conclusion exists;
- `scoring.status` is `FAILED`, with a stable error code.

## Auditability

A transaction records what happened. A fraud prediction records what the system concluded about that transaction. They remain separate so one transaction can retain multiple historical predictions.

```text
users 1 ----< accounts 1 ----< transactions 1 ----< fraud_predictions
```

Each prediction records:

- the model version that produced the score;
- the decision-policy version that interpreted the score;
- the stored score and decision;
- when the prediction was created.

Predictions created before policy tracking were added are labeled `legacy_unversioned`. Their API explanation honestly states that the original thresholds cannot be verified instead of applying today’s thresholds retroactively.

## Machine-Learning Model

The persisted `banksim_logistic_v1` pipeline uses transaction amount and merchant category. It was trained and evaluated chronologically on the synthetic BankSim dataset.

Final test results:

- ROC AUC: `0.9920`;
- average precision: `0.7689`;
- test fraud prevalence: `1.08%`;
- harder non-transportation ROC AUC: `0.9439`.

These results support the educational pipeline on simulated data only. They are not evidence of real-world production performance. The raw BankSim CSV is intentionally excluded from Git; the versioned fitted pipeline and metadata are included.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Express health check |
| `GET` | `/api/transactions/pending` | All pending transactions |
| `GET` | `/api/transactions/pending?username=Customer1` | Pending transactions filtered by username |
| `GET` | `/api/transactions/:transactionId` | One transaction with nested prediction history |
| `GET` | `/api/transactions/:transactionId/predictions` | Standalone prediction history |
| `POST` | `/api/transactions` | Store and automatically score a transaction |
| `PATCH` | `/api/transactions/:transactionId/status` | Manually resolve a pending transaction |

### Create and score a transaction

Required request fields are `account_id`, `amount`, `currency`, `merchant_category`, and `occurred_at`. The amount must be a positive decimal string, and the timestamp must be canonical ISO 8601 UTC.

```json
{
  "account_id": 1,
  "amount": "125.50",
  "merchant": "Campus Store",
  "merchant_category": "es_fashion",
  "device": "mobile",
  "currency": "USD",
  "occurred_at": "2026-09-23T23:29:45.000Z"
}
```

A successful score returns the stored transaction, persisted prediction, and backend-generated explanation:

```json
{
  "transaction": {
    "id": 17,
    "transaction_status": "PENDING"
  },
  "scoring": {
    "status": "SUCCESS",
    "prediction": {
      "model_version": "banksim_logistic_v1",
      "decision_policy_version": "fraud_thresholds_v1",
      "score_probability": "0.823451",
      "decision": "REVIEW"
    },
    "explanation": {
      "reason_code": "SCORE_IN_REVIEW_RANGE"
    }
  }
}
```

When automatic scoring fails after the transaction is stored:

```json
{
  "transaction": {
    "id": 18,
    "transaction_status": "PENDING"
  },
  "scoring": {
    "status": "FAILED",
    "prediction": null,
    "explanation": null,
    "error_code": "ML_SERVICE_TIMEOUT"
  }
}
```

## Local Setup

### Prerequisites

- Node.js
- PostgreSQL
- Python 3.14

### 1. Install dependencies

From the repository root:

```powershell
npm install
cd frontend
npm install
cd ..
```

Create the Python environment:

```powershell
cd ml_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
cd ..
```

### 2. Configure environment variables

Copy `.env.example` to `.env`, then set your local PostgreSQL connection values:

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=fraudguard
DATABASE_USER=postgres
DATABASE_PASSWORD=replace_with_your_local_postgres_password
ML_SERVICE_URL=http://127.0.0.1:8000
ML_SERVICE_TIMEOUT_MS=2000
```

The non-secret database settings shown above are also the application's local defaults. Docker Compose will later override the host with the PostgreSQL service name; the source code does not need to change between environments.

### 3. Create the database

Create an empty PostgreSQL database named `fraudguard`, then run `database/schema.sql` once using pgAdmin or another PostgreSQL client.

Seed the fresh database with a development user, account, transactions, and prediction history:

```powershell
npm run seed
```

Run the seed once against an empty database. It intentionally uses a fixed username, so running it again will fail the unique-username constraint and roll back the whole seed transaction.

Do not run the migration files after creating a fresh database from the current schema. They exist only to upgrade older development databases:

1. `001_add_merchant_category.sql`
2. `002_add_decision_policy_version.sql`

### 4. Start all three application processes

Start FastAPI from `ml_service`:

```powershell
cd ml_service
.\.venv\Scripts\Activate.ps1
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, start Express from the repository root:

```powershell
npm run dev
```

In a third terminal, start Vite:

```powershell
cd frontend
npm run dev
```

Vite forwards relative `/api` requests to Express on port `3000`. FastAPI runs on port `8000`.

### 5. Build the standalone service images

Build the Express production-dependency image from the repository root:

```powershell
docker build --tag fraudguard-api .
```

For an isolated startup smoke test, run the image and request its health endpoint:

```powershell
docker run --rm --publish 3001:3000 fraudguard-api
```

Then open `http://127.0.0.1:3001/health`; the expected response is `{"status":"ok"}`. This standalone check does not connect the container to PostgreSQL or FastAPI. That service wiring belongs to the planned Docker Compose checkpoint.

Build the FastAPI image using `ml_service` as its isolated build context:

```powershell
docker build --tag fraudguard-ml ml_service
docker run --rm --publish 8001:8000 fraudguard-ml
```

Its health endpoint at `http://127.0.0.1:8001/health` should return `{"status":"ok","model_loaded":true}`. The image includes the versioned model artifacts and binds Uvicorn to `0.0.0.0` so Docker can publish the service outside the container.

### 6. Run the backend stack with Docker Compose

Start PostgreSQL, FastAPI, and Express from the repository root:

```powershell
docker compose up --detach --build
```

Compose initializes `database/schema.sql` only when its named PostgreSQL volume is new. Seed that fresh database once:

```powershell
docker compose exec api npm run seed
```

Express is available at `http://127.0.0.1:3000`; PostgreSQL and FastAPI remain private to the Compose network. The API waits for both dependencies to report healthy before starting.

Stop and remove the containers while preserving database data:

```powershell
docker compose down
```

Do not add `--volumes` unless you intentionally want to delete the isolated Compose database and initialize it again.

## Verification

Backend tests from the repository root:

```powershell
npm.cmd test -- --runInBand
```

Frontend tests, lint, and production build:

```powershell
cd frontend
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run build
cd ..
```

Python tests and formatting checks from the repository root with the virtual environment active:

```powershell
python -m pytest ml_service
python -m ruff check ml_service
python -m ruff format --check ml_service
```

Current automated verification:

- 132 passing backend Jest/Supertest and query-layer tests;
- 7 passing frontend Vitest/React Testing Library tests;
- 5 passing Python pytest tests;
- frontend ESLint and production build passing.

## Project Structure

```text
database/
  migrations/          Additive upgrades for older development databases
  schema.sql           Fresh PostgreSQL schema
  readQueries.js       Parameterized application reads
  writeQueries.js      Parameterized writes and pending-only status update
src/
  clients/             FastAPI prediction client
  controllers/         HTTP validation and response mapping
  middleware/          JSON 404 and centralized error handling
  routes/              Express route definitions
  services/            Orchestration, decisions, and response shaping
  test/                Jest, Supertest, and query-layer tests
frontend/
  src/api/             Browser API helpers
  src/components/      Reusable analyst UI components
  src/pages/           Page-level request state and review workflow
ml_service/
  app.py               FastAPI health and prediction endpoints
  models/              Versioned pipeline and model metadata
  banksim_analysis.py  Training, evaluation, and artifact persistence
  test_app.py          FastAPI behavior tests
```

## Technology Stack

- React 19, Vite, JavaScript, and CSS
- Node.js, Express 5, and the built-in Fetch API
- PostgreSQL and `pg`
- Python 3.14, pandas, NumPy, and scikit-learn
- FastAPI and Uvicorn
- Jest, Supertest, Vitest, React Testing Library, pytest, Ruff, and ESLint

## Current Limitations

- The model was trained on synthetic BankSim data and is not suitable for real financial decisions.
- Authentication, authorization, and reviewer identity are intentionally outside the current V1 scope.
- Prediction insertion and automatic transaction-status update are separate database statements rather than one atomic database transaction.
- The PostgreSQL, Express, and FastAPI Compose stack is implemented, but frontend containerization and deployment are not yet complete.

## Security Notes

- Never commit `.env`, passwords, API keys, or real customer data.
- The included password value is a development placeholder, not a real authentication credential.
- Load the joblib model only from a trusted project source because deserialization can execute code.
- FraudGuard is an educational portfolio project, not a production fraud-control system.

## Roadmap

- Days 1-4: PostgreSQL architecture and data integrity
- Days 5-9: Express API and transaction workflows
- Days 10-12: React analyst dashboard
- Days 13-18: Python and pandas foundations
- Days 19-24: machine-learning evaluation and model selection
- Days 25-28: FastAPI inference and automatic scoring integration
- Days 29-33: explainability and decision-policy auditability
- Days 34-40: final testing, Docker, deployment, documentation, and portfolio polish
