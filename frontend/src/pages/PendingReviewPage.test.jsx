import { beforeEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PendingReviewPage from "./PendingReviewPage";
import {
  getPendingTransactions,
  getTransactionDetails,
  updateTransactionStatus,
} from "../api/transactionsApi";

beforeEach(() => vi.resetAllMocks());

vi.mock("../api/transactionsApi", () => ({
  getPendingTransactions: vi.fn(),
  getTransactionDetails: vi.fn(),
  updateTransactionStatus: vi.fn(),
}));

test("Test the empty pending queue.", async () => {
  getPendingTransactions.mockResolvedValue([]);

  render(<PendingReviewPage />);

  expect(
    await screen.findByText("No pending transactions found."),
  ).toBeInTheDocument();
});

test("Test for a failed queue request.", async () => {
  getPendingTransactions.mockRejectedValue(new Error("Network unavailable"));

  render(<PendingReviewPage />);

  expect(
    await screen.findByText(
      "Unable to load pending transactions. Please try again.",
    ),
  ).toBeInTheDocument();
});

test("Test the loading state.", () => {
  getPendingTransactions.mockReturnValue(new Promise(() => {}));

  render(<PendingReviewPage />);

  expect(
    screen.getByText("Loading pending transactions..."),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("No pending transactions found."),
  ).not.toBeInTheDocument();
});

test("Test a populated queue.", async () => {
  const transaction = {
    transaction_id: 1,
    username: "User1",
    amount: "125.50",
    currency: "USD",
    merchant: null,
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
  };

  getPendingTransactions.mockResolvedValue([transaction]);

  render(<PendingReviewPage />);

  expect(await screen.findByText("User1")).toBeInTheDocument();
  expect(await screen.findByText("$125.50")).toBeInTheDocument();
  expect(
    await screen.getByRole("button", { name: "View Details" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Loading pending transactions..."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("No pending transactions found."),
  ).not.toBeInTheDocument();
});

test("Test selecting a transaction.", async () => {
  const transaction = {
    transaction_id: 1,
    username: "User1",
    amount: "125.50",
    currency: "USD",
    merchant: null,
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
  };
  const detailTransaction = {
    transaction_id: 1,
    username: "User1",
    amount: "125.50",
    currency: "USD",
    merchant: null,
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
    account_id: 2,
    device: null,
    created_at: "2026-08-26T12:00:10.000Z",
    predictions: [],
  };
  const user = userEvent.setup();

  getPendingTransactions.mockResolvedValue([transaction]);
  getTransactionDetails.mockResolvedValue(detailTransaction);
  render(<PendingReviewPage />);

  const button = await screen.findByRole("button", { name: "View Details" });
  await user.click(button);

  expect(
    await screen.findByRole("heading", {
      name: "Transaction #1",
    }),
  ).toBeInTheDocument();
  expect(
    await screen.findByText(
      "No prediction history is available for this transaction.",
    ),
  ).toBeInTheDocument();
});

test("Test successful approval", async () => {
  const transaction = {
    transaction_id: 1,
    username: "User1",
    amount: "125.50",
    currency: "USD",
    merchant: null,
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
  };
  const detailTransaction = {
    transaction_id: 1,
    username: "User1",
    amount: "125.50",
    currency: "USD",
    merchant: null,
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
    account_id: 2,
    device: null,
    created_at: "2026-08-26T12:00:10.000Z",
    predictions: [
      {
        prediction_id: 1,
        model_version: "v0.2",
        decision: "REVIEW",
        score_probability: "0.75",
        prediction_created_at: "2026-08-26T12:00:00.000Z",
      },
    ],
  };
  const transactionStatus = { transaction_status: "COMPLETED" };
  const user = userEvent.setup();

  updateTransactionStatus.mockResolvedValue(transactionStatus);
  getPendingTransactions.mockResolvedValue([transaction]);
  getTransactionDetails.mockResolvedValue(detailTransaction);
  render(<PendingReviewPage />);

  const viewDetailsButton = await screen.findByRole("button", {
    name: "View Details",
  });
  await user.click(viewDetailsButton);

  const approveButton = await screen.findByRole("button", {
    name: "Approve transaction",
  });
  await user.click(approveButton);

  expect(updateTransactionStatus).toHaveBeenCalledWith(1, "COMPLETED", {});
  expect(
    await screen.findByText("No pending transactions found."),
  ).toBeInTheDocument();
  expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  expect(screen.getByText("v0.2")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "View Details" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Approve transaction" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Decline transaction" }),
  ).not.toBeInTheDocument();
});

test("Test 409 conflict", async () => {
  const transaction = {
    transaction_id: 1,
    username: "User1",
    amount: "125.50",
    currency: "USD",
    merchant: null,
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
  };
  const detailTransaction = {
    transaction_id: 1,
    username: "User1",
    amount: "125.50",
    currency: "USD",
    merchant: null,
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
    account_id: 2,
    device: null,
    created_at: "2026-08-26T12:00:10.000Z",
    predictions: [
      {
        prediction_id: 1,
        model_version: "v0.2",
        decision: "REVIEW",
        score_probability: "0.75",
        prediction_created_at: "2026-08-26T12:00:00.000Z",
      },
    ],
  };
  const user = userEvent.setup();
  const conflictError = new Error("Transaction already resolved");
  conflictError.status = 409;
  conflictError.body = { current_status: "DECLINED" };

  updateTransactionStatus.mockRejectedValue(conflictError);
  getTransactionDetails.mockResolvedValue(detailTransaction);
  getPendingTransactions.mockResolvedValue([transaction]);

  render(<PendingReviewPage />);

  const viewDetailsButton = await screen.findByRole("button", {
    name: "View Details",
  });
  await user.click(viewDetailsButton);

  const approveButton = await screen.findByRole("button", {
    name: "Approve transaction",
  });
  await user.click(approveButton);

  expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
  expect(
    await screen.findByText(
      "Transaction already resolved with the current status DECLINED",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("DECLINED")).toBeInTheDocument();
  expect(screen.getByText("v0.2")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Approve transaction" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Decline transaction" }),
  ).not.toBeInTheDocument();
});
