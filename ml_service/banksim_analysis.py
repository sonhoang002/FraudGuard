import json
import platform
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

BASE_DIR = Path(__file__).resolve().parent
FILE_PATH = BASE_DIR / "data" / "bs140513_032310.csv"
MODEL_PATH = BASE_DIR / "models" / "banksim_logistic_v1.joblib"
JSON_PATH = BASE_DIR / "models" / "banksim_logistic_v1.json"


def main():
    loaded_data = pd.read_csv(FILE_PATH, quotechar="'")
    print(loaded_data.shape)
    print(loaded_data.columns.tolist())
    print(loaded_data.dtypes)
    print(loaded_data.isna().sum())
    print(loaded_data["fraud"].value_counts())
    print(loaded_data["fraud"].mean() * 100)
    print(loaded_data.duplicated().sum())
    print(
        loaded_data[
            ["step", "customer", "zipcodeOri", "merchant", "zipMerchant", "category"]
        ].nunique()
    )

    category_summary = (
        loaded_data.groupby("category")
        .agg(
            transaction_count=("fraud", "size"),
            fraud_count=("fraud", "sum"),
            fraud_rate=("fraud", "mean"),
        )
        .sort_values(by="fraud_rate", ascending=False)
    )
    fraud_summary = loaded_data.groupby("fraud").agg(
        count=("amount", "count"),
        mean=("amount", "mean"),
        median=("amount", "median"),
        minimum=("amount", "min"),
        maximum=("amount", "max"),
    )
    print(category_summary)
    print(fraud_summary)

    print(loaded_data[loaded_data["amount"] <= 0].shape[0])
    print(loaded_data[loaded_data["amount"] <= 0]["fraud"].value_counts())
    print(loaded_data[loaded_data["amount"] > 0]["amount"].min())

    cleaned_data = loaded_data[loaded_data["amount"] > 0].copy()
    print(loaded_data.shape)
    print(cleaned_data.shape)
    print((cleaned_data["amount"] <= 0).sum())
    print(loaded_data["fraud"].sum())
    print(cleaned_data["fraud"].sum())
    print(cleaned_data.head(1))

    category_counts_per_merchant = cleaned_data.groupby("merchant")[
        "category"
    ].nunique()

    print("Minimum:", category_counts_per_merchant.min())
    print("Maximum:", category_counts_per_merchant.max())

    print("Frequency distribution:")
    print(category_counts_per_merchant.value_counts().sort_index())

    merchants_counts_per_category = cleaned_data.groupby("category")[
        "merchant"
    ].nunique()

    print("Frequency distribution:")
    print(merchants_counts_per_category.value_counts().sort_index(ascending=True))

    feature_columns = ["amount", "category", "merchant"]
    training, validation, test = (
        cleaned_data[cleaned_data["step"].between(0, 107)],
        cleaned_data[cleaned_data["step"].between(108, 143)],
        cleaned_data[cleaned_data["step"].between(144, 179)],
    )

    print(training["step"].max())
    print(validation["step"].max())
    print(test["step"].max())
    print(training.shape)
    print(validation.shape)
    print(test.shape)
    print(training.shape[0] + validation.shape[0] + test.shape[0])

    X_train = training[feature_columns]
    X_validation = validation[feature_columns]
    X_test = test[feature_columns]
    y_train = training["fraud"]
    y_validation = validation["fraud"]
    y_test = test["fraud"]

    print(X_train.shape)
    print(X_validation.shape)
    print(X_test.shape)
    print(y_train.shape)
    print(y_validation.shape)
    print(y_test.shape)
    print(y_train.mean() * 100)
    print(y_validation.mean() * 100)
    print(y_test.mean() * 100)

    numeric_feature_columns = ["amount"]
    categorical_feature_columns = ["category", "merchant"]

    numeric_pipeline = Pipeline(steps=[("scaler", StandardScaler())])
    category_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, numeric_feature_columns),
            ("categorical", category_pipeline, categorical_feature_columns),
        ]
    )

    logistic_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )

    logistic_model.fit(X_train, y_train)
    validation_probabilities = logistic_model.predict_proba(X_validation)[:, 1]
    validation_roc_auc = roc_auc_score(y_validation, validation_probabilities)
    validation_average_precision = average_precision_score(
        y_validation, validation_probabilities
    )
    validation_fraud_prevalence = y_validation.mean()

    print(f"Validation ROC AUC: {validation_roc_auc:.4f}")
    print(f"Validation Average Precision: {validation_average_precision:.4f}")
    print(f"Validation Fraud Prevalence: {validation_fraud_prevalence:.4f}")

    new_categorical_feature_columns = ["category"]

    new_categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    new_preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, numeric_feature_columns),
            ("categorical", new_categorical_pipeline, new_categorical_feature_columns),
        ]
    )

    new_logistic_model = Pipeline(
        steps=[
            ("preprocessor", new_preprocessor),
            (
                "classifier",
                LogisticRegression(max_iter=1000, class_weight="balanced"),
            ),
        ]
    )

    new_logistic_model.fit(X_train, y_train)
    new_validation_probabilities = new_logistic_model.predict_proba(X_validation)[:, 1]
    new_validation_roc_auc = roc_auc_score(y_validation, new_validation_probabilities)
    new_validation_average_precision = average_precision_score(
        y_validation, new_validation_probabilities
    )
    new_validation_fraud_prevalence = y_validation.mean()

    print(f"Validation ROC AUC(no merchant): {new_validation_roc_auc:.4f}")
    print(
        f"Validation Average Precision(no merchant): {new_validation_average_precision:.4f}"
    )
    print(
        f"Validation Fraud Prevalence(no merchant): {new_validation_fraud_prevalence:.4f}"
    )

    non_transport_mask = X_validation["category"] != "es_transportation"

    validation_probabilities_except_transport = new_validation_probabilities[
        non_transport_mask.to_numpy()
    ]

    roc_auc_score_non_transport = roc_auc_score(
        y_validation[non_transport_mask],
        validation_probabilities_except_transport,
    )
    average_precision_score_non_transport = average_precision_score(
        y_validation[non_transport_mask],
        validation_probabilities_except_transport,
    )
    validation_fraud_prevalence_non_transport = y_validation[non_transport_mask].mean()
    print(X_validation[non_transport_mask].shape[0])
    print(
        f"Validation ROC AUC(no merchant + transport): {roc_auc_score_non_transport:.4f}"
    )
    print(
        f"Validation Average Precision(no merchant + transport): {average_precision_score_non_transport:.4f}"
    )
    print(
        f"Validation Fraud Prevalence(no merchant + transport): {validation_fraud_prevalence_non_transport:.4f}"
    )

    amount_only_preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, numeric_feature_columns),
        ]
    )

    amount_only_logistic_model = Pipeline(
        steps=[
            ("preprocessor", amount_only_preprocessor),
            (
                "classifier",
                LogisticRegression(max_iter=1000, class_weight="balanced"),
            ),
        ]
    )

    amount_only_logistic_model.fit(X_train, y_train)
    amount_only_validation_probabilities = amount_only_logistic_model.predict_proba(
        X_validation
    )[:, 1]
    amount_only_validation_roc_auc = roc_auc_score(
        y_validation, amount_only_validation_probabilities
    )
    amount_only_validation_average_precision = average_precision_score(
        y_validation, amount_only_validation_probabilities
    )
    amount_only_validation_fraud_prevalence = y_validation.mean()
    print(f"Validation ROC AUC(only amount): {amount_only_validation_roc_auc:.4f}")
    print(
        f"Validation Average Precision(only amount): {amount_only_validation_average_precision:.4f}"
    )
    print(
        f"Validation Fraud Prevalence(only amount): {amount_only_validation_fraud_prevalence:.4f}"
    )

    development = cleaned_data[cleaned_data["step"].between(0, 143)]
    selected_feature_columns = ["amount", "category"]
    selected_categorical_columns = ["category"]
    X_development = development[selected_feature_columns]
    y_development = development["fraud"]

    X_test_selected = X_test[selected_feature_columns]

    numeric_selected_pipeline = Pipeline(steps=[("scaler", StandardScaler())])
    category_selected_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    development_preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_selected_pipeline, numeric_feature_columns),
            ("categorical", category_selected_pipeline, selected_categorical_columns),
        ]
    )
    development_pipeline = Pipeline(
        steps=[
            ("preprocessor", development_preprocessor),
            (
                "classifier",
                LogisticRegression(max_iter=1000, class_weight="balanced"),
            ),
        ]
    )
    development_pipeline.fit(X_development, y_development)
    test_probabilities = development_pipeline.predict_proba(X_test_selected)[:, 1]

    test_roc_auc = roc_auc_score(
        y_test,
        test_probabilities,
    )

    test_average_precision = average_precision_score(
        y_test,
        test_probabilities,
    )

    test_fraud_prevalence = y_test.mean()

    print(f"Test ROC AUC: {test_roc_auc:.4f}")
    print(f"Test Average Precision: {test_average_precision:.4f}")
    print(f"Test Fraud Prevalence: {test_fraud_prevalence:.4f}")

    non_transport_mask_test = X_test["category"] != "es_transportation"
    y_test_non_transport = y_test[non_transport_mask_test]
    non_transport_probabilities = test_probabilities[non_transport_mask_test.to_numpy()]
    non_transport_roc_auc = roc_auc_score(
        y_test_non_transport,
        non_transport_probabilities,
    )

    non_transport_average_precision = average_precision_score(
        y_test_non_transport,
        non_transport_probabilities,
    )

    non_transport_fraud_prevalence = y_test_non_transport.mean()

    print(f"Non-transport Test ROC AUC: {non_transport_roc_auc:.4f}")

    print(
        f"Non-transport Test Average Precision: {non_transport_average_precision:.4f}"
    )

    print(f"Non-transport Test Fraud Prevalence: {non_transport_fraud_prevalence:.4f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(development_pipeline, MODEL_PATH)
    loaded_model = joblib.load(MODEL_PATH)
    loaded_model_probability = loaded_model.predict_proba(X_test_selected)[:, 1]
    print(np.allclose(loaded_model_probability, test_probabilities))

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    banksim_logistic = {
        "model_version": "banksim_logistic_v1",
        "model_type": "LogisticRegression",
        "features": ["amount", "category"],
        "training_steps": {"start": 0, "end": 143},
        "test_metrics": {
            "roc_auc": test_roc_auc,
            "average_precision": test_average_precision,
            "fraud_prevalence": test_fraud_prevalence,
        },
        "non_transport_test_metrics": {
            "roc_auc": non_transport_roc_auc,
            "average_precision": non_transport_average_precision,
            "fraud_prevalence": non_transport_fraud_prevalence,
        },
        "data_source": "BankSim synthetic",
        "python_version": platform.python_version(),
        "scikit_learn_version": sklearn.__version__,
    }
    with JSON_PATH.open("w", encoding="utf-8") as file:
        json.dump(banksim_logistic, file, indent=2)


if __name__ == "__main__":
    main()
