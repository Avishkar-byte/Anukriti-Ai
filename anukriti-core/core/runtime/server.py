"""
Runtime Digital Twin inference — loads REAL trained models.
"""

import os
import numpy as np
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter(prefix="/runtime", tags=["Runtime Digital Twin"])

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "models")

# Cache loaded models
_loaded_models: Dict[str, Any] = {}


class InferenceRequest(BaseModel):
    model_id: str
    input_data: Dict[str, float]


class InferenceResponse(BaseModel):
    model_id: str
    prediction: Dict[str, float]
    confidence: float
    model_type: str


def _load_model(model_id: str):
    """Load a trained model from disk."""
    if model_id in _loaded_models:
        return _loaded_models[model_id]

    model_path = os.path.join(MODELS_DIR, "%s.pkl" % model_id)
    if not os.path.exists(model_path):
        return None

    try:
        import joblib
        data = joblib.load(model_path)
        _loaded_models[model_id] = data
        print("[Runtime] ✅ Loaded model: %s" % model_id)
        return data
    except Exception as e:
        print("[Runtime] ❌ Failed to load model %s: %s" % (model_id, str(e)))
        return None


@router.post("/infer", response_model=InferenceResponse)
async def infer(request: InferenceRequest):
    """
    Run inference on a deployed Digital Twin model.
    Uses the REAL trained sklearn model.
    """
    model_data = _load_model(request.model_id)

    if model_data is None:
        # Fallback if model not found — be honest about it
        raise HTTPException(
            404,
            detail="Model '%s' not found. Train a digital twin first." % request.model_id
        )

    try:
        # Build input feature vector
        feature_names = model_data["feature_names"]
        scaler = model_data["scalers"]["global"]
        gb_models = model_data["gb_models"]
        mlp_models = model_data["mlp_models"]
        target_names = model_data["target_names"]

        # Map input_data to feature vector
        X = np.zeros((1, len(feature_names)))
        for i, fname in enumerate(feature_names):
            if fname in request.input_data:
                X[0, i] = request.input_data[fname]
            elif fname == "time" and "time" in request.input_data:
                X[0, i] = request.input_data["time"]

        X_scaled = scaler.transform(X)

        # Run ensemble prediction
        predictions = {}
        confidences = []
        for target in target_names:
            gb_pred = gb_models[target].predict(X_scaled)[0]
            mlp_pred = mlp_models[target].predict(X_scaled)[0]
            ensemble = (gb_pred + mlp_pred) / 2.0
            predictions[target] = round(float(ensemble), 6)

            # Confidence from agreement between models
            if abs(ensemble) > 1e-10:
                agreement = 1.0 - abs(gb_pred - mlp_pred) / (abs(ensemble) + 1e-10)
                confidences.append(max(0.0, min(1.0, agreement)))

        overall_confidence = float(np.mean(confidences)) if confidences else 0.5

        return InferenceResponse(
            model_id=request.model_id,
            prediction=predictions,
            confidence=round(overall_confidence, 4),
            model_type="GradientBoosting+MLP Ensemble"
        )

    except Exception as e:
        raise HTTPException(500, detail="Inference failed: %s" % str(e))


@router.get("/telemetry/{model_id}")
async def get_telemetry(model_id: str):
    """
    Get info about a trained twin model.
    """
    model_data = _load_model(model_id)

    if model_data is None:
        model_path = os.path.join(MODELS_DIR, "%s.pkl" % model_id)
        return {
            "model_id": model_id,
            "status": "not_found",
            "model_path": model_path,
            "exists": False,
        }

    metadata = model_data.get("metadata", {})
    return {
        "model_id": model_id,
        "status": "loaded",
        "exists": True,
        "accuracy": metadata.get("overall_accuracy", 0),
        "n_features": metadata.get("n_features", 0),
        "n_targets": metadata.get("n_targets", 0),
        "train_samples": metadata.get("train_samples", 0),
        "train_duration": metadata.get("train_duration_seconds", 0),
        "target_channels": model_data.get("target_names", []),
    }
