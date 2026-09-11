import pandas as pd
import pytest

from ml_service.transaction_practice import (
    prepare_transactions,
    validate_transactions,
)


def test_prepare_transactions_cleans_data_without_changing_input():
    transaction_data = pd.DataFrame(
        [
            {
                "transaction_id": 1,
                "amount": 130.00,
                "merchant": None,
                "device": None,
                "is_fraud": True,
            },
            {
                "transaction_id": 2,
                "amount": 120.00,
                "merchant": None,
                "device": None,
                "is_fraud": True,
            },
        ]
    )

    cleaned_data = prepare_transactions(transaction_data, 130)

    assert cleaned_data["merchant"].tolist() == ["UNKNOWN", "UNKNOWN"]
    assert cleaned_data["device"].tolist() == ["UNKNOWN", "UNKNOWN"]
    assert cleaned_data["is_high_value"].tolist() == [True, False]
    assert transaction_data["merchant"].isna().all()
    assert transaction_data["device"].isna().all()


def test_validate_transactions_rejects_incorrect_columns():
    transaction_data = pd.DataFrame(
        [
            {
                "transaction_id": 1,
                "amount": 130.00,
                "merchant": None,
                "is_fraud": True,
            },
            {
                "transaction_id": 2,
                "amount": 120.00,
                "merchant": None,
                "is_fraud": True,
            },
        ]
    )

    with pytest.raises(ValueError, match="CSV columns are incorrect"):
        validate_transactions(transaction_data)
