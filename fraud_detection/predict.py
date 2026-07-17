"""
predict.py
----------
Loads the trained RandomForest model and label encoders, then exposes
a single public function `predict_transaction` that returns the fraud
probability and binary prediction label for an incoming transaction.

The model and encoders are loaded from disk ONCE and cached at module
level — NOT on every call to predict_transaction. This is critical for
latency: joblib.load() on a RandomForest with 200 trees can take a
noticeable fraction of a second to multiple seconds depending on file
size and disk speed, and doing that on every single API request was
the cause of the multi-second delay when creating transactions.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Artifact paths ─────────────────────────────────────────────────────────────
MODEL_PATH   = Path("fraud_detection/model.pkl")
ENCODER_PATH = Path("fraud_detection/encoder.pkl")

# ── Feature order must match training ─────────────────────────────────────────
FEATURE_COLUMNS = [
    "amount",
    "transaction_count",
    "is_new_location",
    "location",
    "transaction_type",
    "device_type",
]

CATEGORICAL_FEATURES = ["location", "transaction_type", "device_type"]

# ── Module-level cache ─────────────────────────────────────────────────────────
# These start as None and are populated by _load_artifacts() the FIRST time
# predict_transaction() is called (or eagerly at import time — see note below).
# Every subsequent call reuses the same in-memory objects instead of hitting
# disk again.
_model: Any | None = None
_encoder_dict: dict | None = None


def _load_artifacts() -> tuple[Any, dict]:
    """Load model and encoder from disk, caching them at module level.

    On the first call this reads both .pkl files from disk and stores
    them in the module-level _model / _encoder_dict globals. On every
    subsequent call it returns the cached objects immediately — no disk
    I/O, no re-deserialization.

    Returns:
        Tuple of (model, encoder_dict).

    Raises:
        FileNotFoundError: If either artifact is missing.
    """
    global _model, _encoder_dict

    if _model is not None and _encoder_dict is not None:
        return _model, _encoder_dict

    for path in (MODEL_PATH, ENCODER_PATH):
        if not path.exists():
            raise FileNotFoundError(
                f"Artifact not found: '{path}'. "
                "Run fraud_detection/train_model.py first."
            )

    logger.info("Loading model and encoders from disk (first call only)...")
    _model        = joblib.load(MODEL_PATH)
    _encoder_dict = joblib.load(ENCODER_PATH)
    logger.info("Model and encoders loaded successfully and cached in memory.")
    return _model, _encoder_dict


def _build_feature_row(
    data: dict[str, Any],
    encoder_dict: dict,
) -> pd.DataFrame:
    """Convert a raw transaction dict into an encoded feature DataFrame.

    Args:
        data:         Raw transaction dictionary.
        encoder_dict: Fitted LabelEncoder instances keyed by column name.

    Returns:
        Single-row DataFrame ready for prediction.
    """
    row = {
        "amount":            float(data["amount"]),
        "transaction_count": int(data["transaction_count"]),
        "is_new_location":   int(bool(data["is_new_location"])),
        "location":          str(data["location"]),
        "transaction_type":  str(data["transaction_type"]),
        "device_type":       str(data["device_type"]),
    }

    df = pd.DataFrame([row], columns=FEATURE_COLUMNS)

    # Encode categoricals using the saved encoders
    for col in CATEGORICAL_FEATURES:
        le = encoder_dict[col]
        known_classes = list(le.classes_)
        value = df.at[0, col]

        # Map unseen categories to the first known class (fallback)
        if value not in known_classes:
            logger.warning(
                "Unseen value '%s' for '%s'. Defaulting to '%s'.",
                value, col, known_classes[0],
            )
            df.at[0, col] = known_classes[0]

        df[col] = le.transform(df[col].astype(str))

    return df


def predict_transaction(data: dict[str, Any]) -> dict[str, Any]:
    """Predict fraud probability for a single transaction.

    Args:
        data: Dictionary containing transaction fields:
              amount, location, transaction_count, transaction_type,
              device_type, is_new_location.

    Returns:
        Dictionary with:
        - ``fraud_probability`` (int): 0–100 percentage.
        - ``prediction``        (str): "Fraud" or "Normal".

    Example::

        result = predict_transaction({
            "amount": 850000,
            "location": "Islamabad",
            "transaction_count": 17,
            "transaction_type": "Transfer",
            "device_type": "Mobile",
            "is_new_location": True,
        })
        # {"fraud_probability": 92, "prediction": "Fraud"}
    """
    model, encoder_dict = _load_artifacts()
    feature_df = _build_feature_row(data, encoder_dict)

    # predict_proba returns [[prob_normal, prob_fraud]]
    proba: np.ndarray = model.predict_proba(feature_df)[0]
    fraud_prob_float: float = proba[1]
    fraud_probability: int  = round(fraud_prob_float * 100)

    prediction = "Fraud" if fraud_probability >= 50 else "Normal"

    logger.info(
        "Prediction → probability: %d%% | label: %s",
        fraud_probability, prediction,
    )

    return {
        "fraud_probability": fraud_probability,
        "prediction":        prediction,
    }


def preload() -> None:
    """Eagerly load the model and encoders into the module-level cache.

    Call this once at FastAPI startup (see note in fraud-service main file)
    so the FIRST real prediction request is also fast, instead of paying
    the disk-load cost on whichever request happens to arrive first.
    """
    _load_artifacts()


if __name__ == "__main__":
    sample = {
        "amount":            850_000,
        "location":          "Islamabad",
        "transaction_count": 17,
        "transaction_type":  "Transfer",
        "device_type":       "Mobile",
        "is_new_location":   True,
    }
    result = predict_transaction(sample)
    print(result)