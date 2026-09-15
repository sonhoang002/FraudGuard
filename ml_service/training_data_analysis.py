from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

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

    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

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

    dummy_clf = DummyClassifier(strategy="most_frequent")
    dummy_clf.fit(X_train_processed, y_train)
    dummy_predictions = dummy_clf.predict(X_test_processed)
    print(f"{accuracy_score(y_test, dummy_predictions) * 100:.2f}%")
    print(f"{recall_score(y_test, dummy_predictions) * 100:.2f}%")
    print(confusion_matrix(y_test, dummy_predictions))

    model = LogisticRegression(max_iter=1000, class_weight="balanced")
    model.fit(X_train_processed, y_train)
    logistic_predictions = model.predict(X_test_processed)
    print(f"{accuracy_score(y_test, logistic_predictions) * 100:.2f}%")
    print(f"{precision_score(y_test, logistic_predictions) * 100:.2f}%")
    print(f"{recall_score(y_test, logistic_predictions) * 100:.2f}%")
    print(confusion_matrix(y_test, logistic_predictions))
    fraud_probabilities = model.predict_proba(X_test_processed)[:, 1]
    print(fraud_probabilities.min())
    print(fraud_probabilities.mean())
    print(fraud_probabilities.max())

    print(roc_auc_score(y_test, fraud_probabilities))
    print(average_precision_score(y_test, fraud_probabilities))

    logistic_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("logistic", model),
        ]
    )

    stratified_fold = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    logistic_results = cross_validate(
        estimator=logistic_pipeline,
        X=X_train,
        y=y_train,
        cv=stratified_fold,
        scoring=["roc_auc", "average_precision"],
    )

    print(f"ROC AUC fold scores: {logistic_results['test_roc_auc']}")
    print(
        f"Average precision fold scores: {logistic_results['test_average_precision']}"
    )
    print(f"Score time: {logistic_results['score_time'].mean()}")
    print(f"Fit time: {logistic_results['fit_time'].mean()}")
    print(f"Roc_auc: {logistic_results['test_roc_auc'].mean() * 100:.2f}%")
    print(
        f"Average precision: {logistic_results['test_average_precision'].mean() * 100:.2f}%"
    )

    rfc_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=20,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

    random_forest_pipeline = Pipeline(
        steps=[("preprocessor", preprocessor), ("forest", rfc_model)]
    )

    rfc_result = cross_validate(
        estimator=random_forest_pipeline,
        X=X_train,
        y=y_train,
        cv=stratified_fold,
        scoring=["roc_auc", "average_precision"],
        return_train_score=True,
    )

    print(f"ROC AUC fold scores: {rfc_result['test_roc_auc']}")
    print(f"Average precision fold scores: {rfc_result['test_average_precision']}")
    print(f"Score time: {rfc_result['score_time'].mean()}")
    print(f"Fit time: {rfc_result['fit_time'].mean()}")
    print(f"Roc_auc: {rfc_result['test_roc_auc'].mean() * 100:.2f}%")
    print(
        f"Average precision: {rfc_result['test_average_precision'].mean() * 100:.2f}%"
    )
    print(f"ROC AUC train fold scores: {rfc_result['train_roc_auc']}")
    print(
        f"Average precision train fold scores: {rfc_result['train_average_precision']}"
    )
    print(f"Roc_auc: {rfc_result['train_roc_auc'].mean() * 100:.2f}%")
    print(
        f"Average precision: {rfc_result['train_average_precision'].mean() * 100:.2f}%"
    )


if __name__ == "__main__":
    main()
