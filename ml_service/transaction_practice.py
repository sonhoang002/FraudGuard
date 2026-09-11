from pathlib import Path

import pandas as pd

EXPECTED_COLUMNS = ["transaction_id", "amount", "merchant", "device", "is_fraud"]
BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "data" / "transactions.csv"
REQUIRED_COLUMNS = ["transaction_id", "amount", "is_fraud"]


def prepare_transactions(transaction_data, minimum_amount):
    cleaned_data = transaction_data.copy()
    cleaned_data["merchant"] = cleaned_data["merchant"].fillna("UNKNOWN")
    cleaned_data["device"] = cleaned_data["device"].fillna("UNKNOWN")
    cleaned_data["is_high_value"] = cleaned_data["amount"] >= minimum_amount

    return cleaned_data


def validate_transactions(transaction_data):
    loaded_columns = transaction_data.columns.tolist()
    if loaded_columns != EXPECTED_COLUMNS:
        raise ValueError(
            f"CSV columns are incorrect. "
            f"Expected {EXPECTED_COLUMNS}, but got {loaded_columns}."
        )

    missing_by_column = transaction_data[REQUIRED_COLUMNS].isna().any()

    columns_with_missing_values = missing_by_column[missing_by_column].index.tolist()

    if columns_with_missing_values:
        raise ValueError(
            f"Required columns contain missing values: {columns_with_missing_values}"
        )

    if not pd.api.types.is_integer_dtype(transaction_data["transaction_id"]):
        raise ValueError("transaction_id must contain integers.")

    if not pd.api.types.is_numeric_dtype(transaction_data["amount"]):
        raise ValueError("amount must contain numeric values.")

    if not pd.api.types.is_bool_dtype(transaction_data["is_fraud"]):
        raise ValueError("is_fraud must contain boolean.")


def main():
    loaded_data = pd.read_csv(CSV_PATH)

    validate_transactions(loaded_data)
    cleaned_data = prepare_transactions(loaded_data, 130)

    feature_columns = ["amount", "merchant", "device", "is_high_value"]

    X = cleaned_data[feature_columns]
    y = cleaned_data["is_fraud"]

    print(X)
    print(y)
    print(X.shape)
    print(y.shape)

    fraud_counts = cleaned_data["is_fraud"].value_counts()
    overall_fraud_rate = cleaned_data["is_fraud"].mean()
    fraud_rate_by_high_value = cleaned_data.groupby("is_high_value")["is_fraud"].mean()

    print(fraud_counts)
    print(overall_fraud_rate)
    print(fraud_rate_by_high_value)


if __name__ == "__main__":
    main()
