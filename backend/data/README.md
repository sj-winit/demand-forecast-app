# Data Directory

This directory holds cached data and configuration.

## Structure

```
data/
├── cache/              # Cached data files (predictions, processed data)
│   └── .gitkeep        # Ensures directory is tracked by git
└── README.md           # This file
```

## Source Data Location

Raw training data and predictions are stored outside this app:

- **Raw Data**: `D:/Sasanka/Alkhair/webapp/data/raw/static/`
  - `training_data_daily.csv`
  - `training_data_weekly.csv`

- **Predictions**: `D:/Sasanka/Alkhair/webapp/output_weekly/`
  - `merged_predictions.csv`

## Configuration

Data paths are configured in `config.py` in the root directory.
