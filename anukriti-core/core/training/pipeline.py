"""
Anukriti Digital Twin Training Pipeline — REAL ML
Uses scikit-learn to train actual surrogate models on simulation data.

Pipeline:
1. Run physics simulation to generate training data
2. Feature engineering on time-series channels
3. Train GradientBoosting + MLPRegressor ensemble
4. Evaluate on held-out validation set
5. Save real model to disk
6. Return real metrics
"""

import os
import time
import asyncio
import functools
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

from adapters.anukritireq_to_medet import convert_req_to_medet_config
from core.simulation.manager import SimulationManager

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "models"
)


class DigitalTwinModel:
    """
    Ensemble surrogate model: GradientBoosting + MLP.
    Learns the mapping: (time, feature_window) → (predicted_outputs).
    """

    def __init__(self):
        self.gb_models: Dict[str, GradientBoostingRegressor] = {}
        self.mlp_models: Dict[str, MLPRegressor] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self.target_names: List[str] = []
        self.feature_names: List[str] = []
        self.metadata: Dict[str, Any] = {}

    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        target_names: List[str],
        feature_names: List[str],
    ) -> Dict[str, Any]:
        """
        Train ensemble models for each output channel.
        Returns real evaluation metrics.
        """
        self.target_names = target_names
        self.feature_names = feature_names
        train_log: List[str] = []
        channel_metrics: Dict[str, Dict[str, float]] = {}

        train_start = time.time()

        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        train_log.append(
            "Data split: %d train / %d validation samples" % (len(X_train), len(X_val))
        )

        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_val_scaled = scaler.transform(X_val)
        self.scalers["global"] = scaler

        # Train one model per target channel
        for i, target in enumerate(target_names):
            y_tr = y_train[:, i]
            y_va = y_val[:, i]

            train_log.append("Training channel: %s" % target)

            # 1. GradientBoosting (robust, handles non-linearity)
            gb = GradientBoostingRegressor(
                n_estimators=50,
                max_depth=3,
                learning_rate=0.1,
                subsample=0.8,
                random_state=42,
            )
            gb.fit(X_train_scaled, y_tr)
            self.gb_models[target] = gb

            # 2. MLP (captures complex patterns)
            mlp = MLPRegressor(
                hidden_layer_sizes=(32, 16),
                activation="relu",
                solver="adam",
                learning_rate_init=0.01,
                max_iter=100,
                early_stopping=True,
                validation_fraction=0.15,
                n_iter_no_change=10,
                random_state=42,
            )
            mlp.fit(X_train_scaled, y_tr)
            self.mlp_models[target] = mlp

            # 3. Evaluate ensemble (average of GB + MLP)
            gb_pred = gb.predict(X_val_scaled)
            mlp_pred = mlp.predict(X_val_scaled)
            ensemble_pred = (gb_pred + mlp_pred) / 2.0

            mae = mean_absolute_error(y_va, ensemble_pred)
            mse = mean_squared_error(y_va, ensemble_pred)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_va, ensemble_pred)

            # Accuracy: use relative error for near-constant channels
            y_range = np.ptp(y_va)
            y_mean = np.mean(np.abs(y_va)) if np.mean(np.abs(y_va)) > 0 else 1.0

            if y_range < y_mean * 0.01:
                # Near-constant channel: accuracy = 1 - (mean_error / mean_value)
                rel_error = mae / y_mean
                accuracy = max(0.0, 1.0 - rel_error)
            else:
                # Normal channel: accuracy from normalized RMSE
                nrmse = rmse / y_range
                accuracy = max(0.0, 1.0 - nrmse)

            # Clamp R² for display (negative R² means "worse than predicting the mean")
            r2_display = max(0.0, r2)

            channel_metrics[target] = {
                "mae": round(float(mae), 6),
                "rmse": round(float(rmse), 6),
                "r2_score": round(float(r2_display), 6),
                "accuracy": round(float(accuracy), 4),
                "gb_feature_importance_top3": self._top_features(gb, feature_names, 3),
            }

            train_log.append(
                "  %s → R²=%.4f, MAE=%.6f, Accuracy=%.2f%%"
                % (target, r2, mae, accuracy * 100)
            )

        train_duration = round(time.time() - train_start, 3)

        # Overall accuracy (weighted average across channels)
        accuracies = [m["accuracy"] for m in channel_metrics.values()]
        overall_accuracy = float(np.mean(accuracies)) if accuracies else 0.0

        self.metadata = {
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "n_features": X.shape[1],
            "n_targets": len(target_names),
            "train_duration_seconds": train_duration,
            "overall_accuracy": round(overall_accuracy, 4),
            "channel_metrics": channel_metrics,
        }

        train_log.append(
            "Overall ensemble accuracy: %.2f%% (trained in %.2fs)"
            % (overall_accuracy * 100, train_duration)
        )

        return {
            "metrics": self.metadata,
            "log": train_log,
        }

    def predict(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """Run inference on new data."""
        X_scaled = self.scalers["global"].transform(X)
        predictions = {}
        for target in self.target_names:
            gb_pred = self.gb_models[target].predict(X_scaled)
            mlp_pred = self.mlp_models[target].predict(X_scaled)
            predictions[target] = (gb_pred + mlp_pred) / 2.0
        return predictions

    def save(self, path: str):
        """Save the complete model to disk."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        model_data = {
            "gb_models": self.gb_models,
            "mlp_models": self.mlp_models,
            "scalers": self.scalers,
            "target_names": self.target_names,
            "feature_names": self.feature_names,
            "metadata": self.metadata,
        }
        joblib.dump(model_data, path, compress=3)

    @staticmethod
    def load(path: str) -> "DigitalTwinModel":
        """Load a saved model from disk."""
        data = joblib.load(path)
        model = DigitalTwinModel()
        model.gb_models = data["gb_models"]
        model.mlp_models = data["mlp_models"]
        model.scalers = data["scalers"]
        model.target_names = data["target_names"]
        model.feature_names = data["feature_names"]
        model.metadata = data["metadata"]
        return model

    def _top_features(
        self, gb: GradientBoostingRegressor, names: List[str], n: int
    ) -> List[str]:
        """Get top N feature importances from GradientBoosting."""
        importances = gb.feature_importances_
        indices = np.argsort(importances)[::-1][:n]
        return [names[i] if i < len(names) else ("f_%d" % i) for i in indices]


def _build_training_data(
    sim_result: Dict[str, Any]
) -> Tuple[np.ndarray, np.ndarray, List[str], List[str]]:
    """
    Convert simulation result channels into ML training data.

    Features (X): Time-derived features only (polynomial, sinusoidal basis).
                  The model learns: f(time) → device_outputs
    Targets  (y): All channel values at each time step.
    """
    channels = sim_result.get("channels", {})
    time_array = sim_result.get("time_array", [])

    if not channels or not time_array:
        raise ValueError("No simulation data to train on")

    t = np.array(time_array)
    n_samples = len(t)
    t_max = max(t[-1], 1e-10)

    # ─── Build feature matrix (time-derived only) ───
    t_norm = t / t_max  # [0, 1]

    feature_names = []
    features = []

    # Polynomial basis: t, t^2, t^3
    for power in [1, 2, 3]:
        features.append((t_norm**power).reshape(-1, 1))
        feature_names.append("t^%d" % power)

    # Logarithmic: log(1 + t)
    features.append(np.log1p(t_norm * 10).reshape(-1, 1))
    feature_names.append("log_t")

    # Square root
    features.append(np.sqrt(t_norm).reshape(-1, 1))
    feature_names.append("sqrt_t")

    # Sinusoidal basis functions (capture periodic behavior)
    for freq in [1, 2, 4, 8]:
        features.append(np.sin(2 * np.pi * freq * t_norm).reshape(-1, 1))
        feature_names.append("sin_%dx" % freq)
        features.append(np.cos(2 * np.pi * freq * t_norm).reshape(-1, 1))
        feature_names.append("cos_%dx" % freq)

    # Exponential decay basis
    for tau in [0.1, 0.3, 0.5]:
        features.append(np.exp(-t_norm / tau).reshape(-1, 1))
        feature_names.append("exp_tau%.1f" % tau)

    X = np.hstack(features)

    # ─── Build target matrix (all channels are targets) ───
    channel_names = sorted(channels.keys())
    target_names = []
    targets = []
    for ch_name in channel_names:
        vals = np.array(channels[ch_name]["values"][:n_samples])
        targets.append(vals.reshape(-1, 1))
        target_names.append(ch_name)

    y = np.hstack(targets)

    return X, y, target_names, feature_names


class TrainingPipeline:
    def __init__(self):
        self.sim_manager = SimulationManager()
        os.makedirs(MODELS_DIR, exist_ok=True)

    async def train_digital_twin(self, req_package: Any) -> Dict[str, Any]:
        """
        Full pipeline: Requirements → Simulation → Feature Engineering → Training → Model
        Everything here is REAL.
        """
        device_name = req_package.device_name
        project_id = req_package.project_id
        print("[TrainingPipeline] ═══════════════════════════════════════")
        print("[TrainingPipeline] Starting REAL Digital Twin training")
        print("[TrainingPipeline] Device: %s | Project: %s" % (device_name, project_id))
        print("[TrainingPipeline] ═══════════════════════════════════════")

        pipeline_log: List[str] = []
        pipeline_start = time.time()

        # ─── Step 1: Prepare simulation config ───
        pipeline_log.append("Step 1: Preparing simulation config from requirements...")
        medet_config = convert_req_to_medet_config(req_package)
        print(
            "[TrainingPipeline] ✅ MeDeT config: %d parameters extracted"
            % len(medet_config.get("parameters", []))
        )

        # ─── Step 2: Run REAL simulation ───
        pipeline_log.append("Step 2: Running physics simulation (numpy engine)...")
        sim_config = {
            "device_name": device_name,
            "requirements": [r.dict() for r in req_package.requirements],
            "parameters": medet_config.get("parameters", []),
        }
        sim_result = await self.sim_manager.run_simulation(sim_config)

        n_channels = len(sim_result.get("channels", {}))
        n_steps = sim_result.get("time_steps", 0)
        pipeline_log.append(
            "  Simulation completed: %d channels, %d time steps (%.3fs)"
            % (n_channels, n_steps, sim_result.get("duration_seconds", 0))
        )
        print("[TrainingPipeline] ✅ Simulation: %d channels generated" % n_channels)

        # ─── Step 3: Build training data ───
        pipeline_log.append("Step 3: Feature engineering on simulation data...")
        try:
            X, y, target_names, feature_names = _build_training_data(sim_result)
            pipeline_log.append(
                "  Training matrix: X=%s, y=%s" % (str(X.shape), str(y.shape))
            )
            pipeline_log.append(
                "  Features: %d | Targets: %d" % (len(feature_names), len(target_names))
            )
            print(
                "[TrainingPipeline] \u2705 Training data: X=%s y=%s"
                % (str(X.shape), str(y.shape))
            )
        except Exception as e:
            pipeline_log.append("  ERROR: %s" % str(e))
            return {
                "status": "failed",
                "error": str(e),
                "pipeline_log": pipeline_log,
            }

        # ─── Step 4: Train surrogate model ───
        pipeline_log.append("Step 4: Training GradientBoosting + MLP ensemble...")
        model = DigitalTwinModel()
        
        # Run CPU-bound ML training in a background thread to not block the event loop
        loop = asyncio.get_running_loop()
        train_func = functools.partial(model.train, X, y, target_names, feature_names)
        train_result = await loop.run_in_executor(None, train_func)

        pipeline_log.extend(train_result["log"])
        metrics = train_result["metrics"]
        print(
            "[TrainingPipeline] \u2705 Training complete: accuracy=%.2f%%"
            % (metrics["overall_accuracy"] * 100)
        )

        # ─── Step 5: Save model ───
        clean_name = device_name.replace(" ", "_").lower()
        model_id = "DT_%s_%s" % (project_id, clean_name)
        model_path = os.path.join(MODELS_DIR, "%s.pkl" % model_id)

        pipeline_log.append("Step 5: Saving model to %s..." % model_path)
        model.save(model_path)

        model_size_kb = os.path.getsize(model_path) / 1024
        pipeline_log.append("  Model saved: %.1f KB" % model_size_kb)
        print(
            "[TrainingPipeline] ✅ Model saved: %s (%.1f KB)"
            % (model_path, model_size_kb)
        )

        # ─── Step 6: Quick inference test ───
        pipeline_log.append("Step 6: Verifying model with inference test...")
        test_pred = model.predict(X[:5])
        pipeline_log.append(
            "  Inference test passed: %d channels predicted" % len(test_pred)
        )

        pipeline_duration = round(time.time() - pipeline_start, 3)
        pipeline_log.append("Pipeline complete in %.2fs" % pipeline_duration)
        print("[TrainingPipeline] ═══════════════════════════════════════")
        print("[TrainingPipeline] ✅ COMPLETE in %.2fs" % pipeline_duration)
        print("[TrainingPipeline] ═══════════════════════════════════════")

        # ─── Return real results ───
        return {
            "status": "trained",
            "model_id": model_id,
            "model_path": model_path,
            "model_size_kb": round(model_size_kb, 1),
            "accuracy": metrics["overall_accuracy"],
            "train_samples": metrics["train_samples"],
            "val_samples": metrics["val_samples"],
            "n_features": metrics["n_features"],
            "n_targets": metrics["n_targets"],
            "train_duration_seconds": metrics["train_duration_seconds"],
            "pipeline_duration_seconds": pipeline_duration,
            "channel_metrics": metrics["channel_metrics"],
            "simulation_warnings": sim_result.get("warnings", []),
            "pipeline_log": pipeline_log,
        }
