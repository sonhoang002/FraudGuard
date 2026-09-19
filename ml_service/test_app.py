from fastapi.testclient import TestClient

from ml_service.app import app


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "model_loaded": True}


def test_valid_prediction():
    with TestClient(app) as client:
        response = client.post(
            "/predict", json={"amount": 125.5, "merchant_category": "es_health"}
        )
        assert response.status_code == 200
        assert (
            response.json()["fraud_probability"] > 0
            and response.json()["fraud_probability"] < 1
        )
        assert response.json()["model_version"] == "banksim_logistic_v1"


def test_invalid_prediction():
    with TestClient(app) as client:
        response = client.post(
            "/predict", json={"amount": 0, "merchant_category": "es_health"}
        )
        assert response.status_code == 422
