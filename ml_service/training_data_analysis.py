from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "FraudDetectionDataset.csv"


def main():
    loaded_data = pd.read_csv(DATA_PATH)

    print(loaded_data.shape)
    print(loaded_data.columns.tolist())
    print(loaded_data["Fraudulent"].value_counts())

    print(loaded_data.isna().sum())
    print(f"Fraud rate: {(loaded_data['Fraudulent'].mean() * 100):.2f}%")

    print(f"Number of completely duplicated rows: {loaded_data.duplicated().sum()}")
    print(
        f"Number of repeated transaction_id: {loaded_data['Transaction_ID'].duplicated().sum()}"
    )
    print(
        loaded_data[loaded_data.duplicated(subset=["Transaction_ID"], keep=False)]
        .sort_values(by="Transaction_ID", ascending=True)
        .head(10)
    )
    print(loaded_data.shape)
    cleaned_data = loaded_data.drop_duplicates()
    print(cleaned_data.shape)
    cleaned_data = cleaned_data[
        ~cleaned_data.duplicated(subset=["Transaction_ID"], keep=False)
    ]
    print(cleaned_data.shape)
    print(cleaned_data["Transaction_ID"].duplicated().sum())
    print(cleaned_data.isna().any(axis=1).sum())

    print(
        f"Missing data percentage: {(cleaned_data.isna().any(axis=1).sum() / cleaned_data.shape[0] * 100):.2f}%"
    )

    y = cleaned_data["Fraudulent"]
    X = cleaned_data[
        [
            "Transaction_Amount",
            "Time_of_Transaction",
            "Device_Used",
            "Number_of_Transactions_Last_24H",
            "Payment_Method",
            "Transaction_Type",
            "Location",
        ]
    ]

    print(X.shape)
    print(y.shape)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(X_train.shape)
    print(X_test.shape)
    print(y_train.shape)
    print(y_test.shape)
    print(f"{(y_train.mean() * 100):.2f}%")
    print(f"{(y_test.mean() * 100):.2f}%")

    numeric_feature_columns = [
        "Transaction_Amount",
        "Time_of_Transaction",
        "Number_of_Transactions_Last_24H",
    ]
    categorical_feature_columns = [
        "Device_Used",
        "Payment_Method",
        "Transaction_Type",
        "Location",
    ]

    numeric_pipeline = Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))])

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("Numeric", numeric_pipeline, numeric_feature_columns),
            ("Categorical", categorical_pipeline, categorical_feature_columns),
        ]
    )

    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)

    print(X_train_processed.shape)
    print(X_test_processed.shape)

    feature_names = preprocessor.get_feature_names_out()
    print(feature_names)
    print(len(feature_names))


if __name__ == "__main__":
    main()
