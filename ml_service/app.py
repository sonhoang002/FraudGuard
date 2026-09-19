import json
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field

model_resources = {}
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "banksim_logistic_v1.joblib"
JSON_PATH = BASE_DIR / "models" / "banksim_logistic_v1.json"


def load_resources():
    model_resources["model"] = joblib.load(MODEL_PATH)

    with JSON_PATH.open(encoding="utf-8") as file:
        model_resources["metadata"] = json.load(file)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        load_resources()
        yield
    finally:
        model_resources.clear()


class PredictionRequest(BaseModel):
    amount: float = Field(gt=0)
    merchant_category: str = Field(min_length=1)


class PredictionResponse(BaseModel):
    fraud_probability: float = Field(ge=0, le=1)
    model_version: str


app = FastAPI(title="FraudGuard ML Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": "model" in model_resources,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    model = model_resources["model"]
    features = pd.DataFrame(
        [{"amount": request.amount, "category": request.merchant_category}]
    )
    result = float(model.predict_proba(features)[0, 1])
    return {
        "fraud_probability": result,
        "model_version": model_resources["metadata"]["model_version"],
    }
