"""
Configuration file for Demand Forecast App
Manages paths for data, cache, and predictions
All dates are SUNDAY-END weeks (Monday-Sunday format)
"""
import os
from pathlib import Path

# Base paths
# config.py is in the project root directory (demand-forecast-app)
BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR

# Data paths - all relative to project root
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"
RAW_DATA_DIR = BASE_DIR / "data" / "raw" / "static"
OUTPUT_DIR = BASE_DIR / "output_weekly"

# Create necessary directories
CACHE_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# File paths
TRAINING_DAILY_FILE = RAW_DATA_DIR / "training_data_daily.csv"
TRAINING_WEEKLY_FILE = RAW_DATA_DIR / "training_data_weekly.csv"
PREDICTIONS_FILE = OUTPUT_DIR / "merged_predictions.csv"

# Cache settings
ENABLE_CACHE = True
CACHE_VERSION = "1.0"

# Cache file paths
PREDICTIONS_CACHE_FILE = CACHE_DIR / "predictions_cache.pkl"
WEEKLY_DATA_CACHE_FILE = CACHE_DIR / "weekly_data_cache.pkl"

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Validation
def validate_paths():
    """Validate that required files exist"""
    issues = []

    if not RAW_DATA_DIR.exists():
        issues.append(f"Raw data directory not found: {RAW_DATA_DIR}")

    if not OUTPUT_DIR.exists():
        issues.append(f"Output directory not found: {OUTPUT_DIR}")

    if TRAINING_DAILY_FILE.exists():
        print(f"[OK] Found daily training data: {TRAINING_DAILY_FILE}")
    else:
        issues.append(f"Daily training data not found: {TRAINING_DAILY_FILE}")

    if TRAINING_WEEKLY_FILE.exists():
        print(f"[OK] Found weekly training data: {TRAINING_WEEKLY_FILE}")
    else:
        issues.append(f"Weekly training data not found: {TRAINING_WEEKLY_FILE}")

    if PREDICTIONS_FILE.exists():
        print(f"[OK] Found predictions: {PREDICTIONS_FILE}")
    else:
        issues.append(f"Predictions file not found: {PREDICTIONS_FILE}")

    if issues:
        print("\n[!] Issues found:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("\n[OK] All paths validated successfully")
        return True

if __name__ == "__main__":
    print("Demand Forecast App Configuration")
    print("Week format: Monday-Sunday (Sunday-end)")
    print("=" * 50)
    print(f"Base Directory: {BASE_DIR}")
    print(f"Project Root: {PROJECT_ROOT}")
    print(f"Raw Data Directory: {RAW_DATA_DIR}")
    print(f"Output Directory: {OUTPUT_DIR}")
    print(f"Cache Directory: {CACHE_DIR}")
    print("=" * 50)
    validate_paths()
