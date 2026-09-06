import pandas as pd

transactions = [
    {
        "transaction_id": 1,
        "amount": 100.00,
        "merchant": "Apple",
        "device": "Phone",
        "is_fraud": True,
    },
    {
        "transaction_id": 2,
        "amount": 120.00,
        "merchant": "Samsung",
        "device": "Computer",
        "is_fraud": False,
    },
    {
        "transaction_id": 3,
        "amount": 140.00,
        "merchant": "Window",
        "device": None,
        "is_fraud": False,
    },
    {
        "transaction_id": 4,
        "amount": 160.00,
        "merchant": None,
        "device": "Console",
        "is_fraud": True,
    },
]


def get_high_value_transactions(transactions, minimum_amount):
    high_value_transactions = [
        transaction
        for transaction in transactions
        if transaction["amount"] >= minimum_amount
    ]

    return high_value_transactions


def main():
    result = get_high_value_transactions(transactions, 130)
    print(result)

    transaction_df = pd.DataFrame(transactions)
    cleaned_df = transaction_df.fillna({"merchant": "UNKNOWN", "device": "UNKNOWN"})

    print(transaction_df.isna().sum())
    print(cleaned_df.isna().sum())

    cleaned_df["is_high_value"] = cleaned_df["amount"] >= 130

    print(cleaned_df[["transaction_id", "amount", "is_high_value"]])
    print(cleaned_df["is_high_value"].sum())


if __name__ == "__main__":
    main()
