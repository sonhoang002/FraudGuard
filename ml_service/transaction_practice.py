from pathlib import Path

import pandas as pd

EXPECTED_COLUMNS = ["transaction_id", "amount", "merchant", "device", "is_fraud"]
BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "data" / "transactions.csv"
REQUIRED_COLUMNS = ["transaction_id", "amount", "is_fraud"]


def main():
    loaded_data = pd.read_csv(CSV_PATH)
    loaded_columns = loaded_data.columns.tolist()
    if loaded_columns != EXPECTED_COLUMNS:
        raise ValueError(
            f"CSV columns are incorrect. "
            f"Expected {EXPECTED_COLUMNS}, but got {loaded_columns}."
        )

    missing_by_column = loaded_data[REQUIRED_COLUMNS].isna().any()

    columns_with_missing_values = missing_by_column[missing_by_column].index.tolist()

    if columns_with_missing_values:
        raise ValueError(
            f"Required columns contain missing values: {columns_with_missing_values}"
        )

    if not pd.api.types.is_integer_dtype(loaded_data["transaction_id"]):
        raise ValueError("transaction_id must contain integers.")

    if not pd.api.types.is_numeric_dtype(loaded_data["amount"]):
        raise ValueError("amount must contain numeric values.")

    if not pd.api.types.is_bool_dtype(loaded_data["is_fraud"]):
        raise ValueError("is_fraud must contain boolean.")

    print(loaded_data)
    print(loaded_data.shape)
    print(loaded_data.columns.tolist())
    print(loaded_data.dtypes)
    print(loaded_data.isna().sum())


if __name__ == "__main__":
    main()
