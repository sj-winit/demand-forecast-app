"""
Data loader for weekly demand forecasting.
Loads training data and predictions with Sunday-end weeks (Monday-Sunday).
Enhanced with logging for debugging.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any
import logging
from .date_utils import (
    get_week_range,
    get_all_weeks_in_range,
    format_week_label
)
import sys
sys.path.append('..')
import config

# Configure logging
logger = logging.getLogger(__name__)


def _convert_to_serializable(obj: Any) -> Any:
    """
    Convert numpy/pandas types to JSON-serializable types.
    """
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        # Handle NaN
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, (np.str_, str)):
        return str(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.strftime('%Y-%m-%d')
    elif pd.isna(obj):
        return None
    return obj


def _sanitize_dict(data: Dict) -> Dict:
    """
    Sanitize a dictionary for JSON serialization.
    """
    return {k: _convert_to_serializable(v) for k, v in data.items()}


class DataLoader:
    """
    Load and manage training data and predictions.
    All weekly data uses Sunday as week END (Monday-Sunday format).
    """

    def __init__(
        self,
        daily_path: str = None,
        weekly_path: str = None,
        predictions_path: str = None
    ):
        """
        Initialize data loader.

        Args:
            daily_path: Path to training_data_daily.csv (defaults to config path)
            weekly_path: Path to training_data_weekly.csv (defaults to config path)
            predictions_path: Path to merged_predictions.csv (defaults to config path)
        """
        # Use config paths if not provided
        self.daily_path = daily_path or str(config.TRAINING_DAILY_FILE)
        self.weekly_path = weekly_path or str(config.TRAINING_WEEKLY_FILE)
        self.predictions_path = predictions_path or str(config.PREDICTIONS_FILE)

        # Load data
        self._load_data()

    def _load_data(self):
        """Load all CSV files with proper date handling."""
        logger.info(f"[DATALOADER] Loading data from paths:")
        logger.info(f"[DATALOADER]   Daily: {self.daily_path}")
        logger.info(f"[DATALOADER]   Weekly: {self.weekly_path}")
        logger.info(f"[DATALOADER]   Predictions: {self.predictions_path}")

        # Load daily data
        try:
            logger.info("[DATALOADER] Loading daily data...")
            self.daily = pd.read_csv(self.daily_path)
            self.daily['TrxDate'] = pd.to_datetime(self.daily['TrxDate'])
            logger.info(f"[DATALOADER] Loaded {len(self.daily)} daily records")
        except FileNotFoundError:
            logger.error(f"[DATALOADER] Daily file not found: {self.daily_path}")
            self.daily = pd.DataFrame()

        # Load weekly training data
        try:
            logger.info("[DATALOADER] Loading weekly data...")
            self.weekly = pd.read_csv(self.weekly_path)
            self.weekly['TrxDate'] = pd.to_datetime(self.weekly['TrxDate'])
            logger.info(f"[DATALOADER] Loaded {len(self.weekly)} weekly records")
        except FileNotFoundError:
            logger.error(f"[DATALOADER] Weekly file not found: {self.weekly_path}")
            self.weekly = pd.DataFrame()

        # Load predictions
        try:
            logger.info("[DATALOADER] Loading predictions...")
            self.predictions = pd.read_csv(self.predictions_path)
            logger.info(f"[DATALOADER] Loaded {len(self.predictions)} prediction rows")
            logger.info(f"[DATALOADER] Prediction columns: {self.predictions.columns.tolist()}")

            # Handle duplicate CustomerID - map each CustomerName to first CustomerID
            # Don't drop rows, just standardize the CustomerID for each CustomerName
            if 'CustomerID' in self.predictions.columns and 'CustomerName' in self.predictions.columns:
                # Create mapping of CustomerName to first CustomerID
                customer_id_map = self.predictions.groupby('CustomerName')['CustomerID'].first().to_dict()
                self.predictions['CustomerID'] = self.predictions['CustomerName'].map(customer_id_map)
                logger.info(f"[DATALOADER] Standardized {len(customer_id_map)} customer IDs")

            # Handle duplicate ItemName - map each ItemCode to first ItemName
            # Don't drop rows, just standardize the ItemName for each ItemCode
            if 'ItemCode' in self.predictions.columns and 'ItemName' in self.predictions.columns:
                # Create mapping of ItemCode to first ItemName
                item_name_map = self.predictions.groupby('ItemCode')['ItemName'].first().to_dict()
                self.predictions['ItemName'] = self.predictions['ItemCode'].map(item_name_map)
                logger.info(f"[DATALOADER] Standardized {len(item_name_map)} item names")

            # Convert string columns to ensure proper types
            string_columns = ['CustomerName', 'ItemCode', 'ItemName', 'Confidence', 'Demand_Pattern', 'DataSplit', 'Method']
            for col in string_columns:
                if col in self.predictions.columns:
                    self.predictions[col] = self.predictions[col].astype(str)

            self.predictions['TrxDate'] = pd.to_datetime(self.predictions['TrxDate'])
            logger.info(f"[DATALOADER] Predictions date range: {self.predictions['TrxDate'].min()} to {self.predictions['TrxDate'].max()}")

            # Add week labels
            self.predictions['WeekLabel'] = self.predictions['TrxDate'].apply(
                lambda x: format_week_label(x.strftime('%Y-%m-%d'), short=True)
            )
            self.predictions['WeekRange'] = self.predictions['TrxDate'].apply(
                lambda x: get_week_range(x.strftime('%Y-%m-%d'))
            )
            logger.info("[DATALOADER] Added week labels to predictions")
        except FileNotFoundError:
            logger.error(f"[DATALOADER] Predictions file not found: {self.predictions_path}")
            self.predictions = pd.DataFrame()

        # Aggregate daily to weekly for consistency
        logger.info("[DATALOADER] Aggregating daily to weekly...")
        self.daily_aggregated = self._aggregate_daily_to_weekly()
        logger.info(f"[DATALOADER] Data loading complete. Predictions: {len(self.predictions)}, Weekly: {len(self.weekly)}")

    def _aggregate_daily_to_weekly(self) -> pd.DataFrame:
        """
        Aggregate daily data to weekly (Sunday-end).

        Returns:
            Weekly aggregated DataFrame with Sunday (week end) dates
        """
        if self.daily.empty:
            return pd.DataFrame()

        daily = self.daily.copy()

        # Calculate week end (Sunday)
        daily['WeekEnd'] = daily['TrxDate'].apply(
            lambda x: x + pd.Timedelta(days=(6 - x.weekday()))
        )

        # Group by week and aggregate
        weekly = daily.groupby(['WeekEnd', 'CustomerID', 'CustomerName', 'ItemCode', 'ItemName']).agg({
            'TotalQuantity': 'sum'
        }).reset_index()

        weekly.rename(columns={'WeekEnd': 'TrxDate'}, inplace=True)

        # Add week labels
        weekly['WeekLabel'] = weekly['TrxDate'].apply(
            lambda x: format_week_label(x.strftime('%Y-%m-%d'), short=True)
        )
        weekly['WeekRange'] = weekly['TrxDate'].apply(
            lambda x: get_week_range(x.strftime('%Y-%m-%d'))
        )

        return weekly

    def get_weekly_predictions(
        self,
        customer: Optional[str] = None,
        item_code: Optional[str] = None,
        start_week: Optional[str] = None,
        end_week: Optional[str] = None,
        confidence: Optional[str] = None,
        pattern: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get weekly forecast data with filters.

        Args:
            customer: Filter by customer name
            item_code: Filter by item code
            start_week: Start week (Sunday date)
            end_week: End week (Sunday date)
            confidence: Filter by confidence level ('high' or 'low')
            pattern: Filter by demand pattern

        Returns:
            List of weekly predictions
        """
        if self.predictions.empty:
            return []

        df = self.predictions.copy()

        # Apply filters
        if customer:
            df = df[df['CustomerName'] == customer]
        if item_code:
            df = df[df['ItemCode'] == item_code]
        if start_week:
            df = df[df['TrxDate'] >= pd.to_datetime(start_week)]
        if end_week:
            df = df[df['TrxDate'] <= pd.to_datetime(end_week)]
        if confidence:
            df = df[df['Confidence'] == confidence]
        if pattern:
            df = df[df['Demand_Pattern'] == pattern]

        # Convert to list of dicts and sanitize for JSON
        records = df.to_dict('records')
        return [_sanitize_dict(record) for record in records]

    def get_daily_breakdown(
        self,
        week_start: str,
        customer: str,
        item_code: str
    ) -> List[Dict[str, Any]]:
        """
        Get daily data for a specific week (drill-down).

        Args:
            week_start: Sunday date string
            customer: Customer name
            item_code: Item code

        Returns:
            List of daily records for the week
        """
        if self.daily.empty:
            return []

        week_start_dt = pd.to_datetime(week_start)
        week_end_dt = week_start_dt + pd.Timedelta(days=6)

        daily = self.daily.copy()

        mask = (
            (daily['TrxDate'] >= week_start_dt) &
            (daily['TrxDate'] <= week_end_dt) &
            (daily['CustomerName'] == customer) &
            (daily['ItemCode'] == item_code)
        )

        result = daily[mask].copy()
        result = result.sort_values('TrxDate')

        # Add day of week
        result['DayOfWeek'] = result['TrxDate'].dt.strftime('%A')

        # Convert to list of dicts and sanitize for JSON
        records = result.to_dict('records')
        return [_sanitize_dict(record) for record in records]

    def get_summary_metrics(self) -> Dict[str, Any]:
        """
        Get summary statistics for the dashboard.

        Returns:
            Dictionary with summary metrics
        """
        if self.predictions.empty:
            return {}

        pred = self.predictions

        # Handle pattern distribution - convert numpy types
        pattern_dist = {}
        if 'Demand_Pattern' in pred.columns:
            pattern_counts = pred['Demand_Pattern'].value_counts()
            pattern_dist = {str(k): int(v) for k, v in pattern_counts.items()}

        return {
            'total_weeks': int(pred['TrxDate'].nunique()),
            'total_predictions': len(pred),
            'date_range': {
                'start': pred['TrxDate'].min().strftime('%Y-%m-%d'),
                'end': pred['TrxDate'].max().strftime('%Y-%m-%d'),
                'start_label': get_week_range(pred['TrxDate'].min().strftime('%Y-%m-%d')),
                'end_label': get_week_range(pred['TrxDate'].max().strftime('%Y-%m-%d'))
            },
            'avg_demand_probability': float(pred['Demand_Probability'].mean()),
            'high_confidence_pct': float((pred['Confidence'] == 'high').mean() * 100) if 'Confidence' in pred.columns else 0,
            'avg_weekly_demand': float(pred['TotalQuantity'].mean()) if 'TotalQuantity' in pred.columns else 0,
            'avg_predicted_demand': float(pred['Predicted'].mean()) if 'Predicted' in pred.columns else 0,
            'pattern_distribution': pattern_dist,
            'total_customers': int(pred['CustomerName'].nunique()),
            'total_items': int(pred['ItemCode'].nunique())
        }

    def get_unique_customers(self) -> List[str]:
        """Get list of unique customer names."""
        if self.predictions.empty:
            return []
        return sorted(self.predictions['CustomerName'].unique().tolist())

    def get_unique_items(self) -> List[Dict[str, str]]:
        """Get list of unique items with codes."""
        if self.predictions.empty:
            return []
        items = self.predictions[['ItemCode', 'ItemName']].drop_duplicates().sort_values('ItemName')
        records = items.to_dict('records')
        return [_sanitize_dict(record) for record in records]

    def get_demand_patterns(self) -> List[str]:
        """Get list of unique demand patterns."""
        if self.predictions.empty:
            return []
        return sorted(self.predictions['Demand_Pattern'].unique().tolist())

    def get_week_labels_in_range(self, start_week: str, end_week: str) -> List[str]:
        """
        Get formatted week labels for a range of weeks.

        Args:
            start_week: Start Sunday date
            end_week: End Sunday date

        Returns:
            List of formatted week labels
        """
        weeks = get_all_weeks_in_range(start_week, end_week)
        return [format_week_label(week, short=True) for week in weeks]

    def compare_training_vs_prediction(self) -> pd.DataFrame:
        """
        Compare aggregated weekly training data with predictions.

        Returns:
            Merged DataFrame with training and prediction data
        """
        if self.weekly.empty or self.predictions.empty:
            return pd.DataFrame()

        # Merge on common columns
        merged = pd.merge(
            self.weekly,
            self.predictions,
            on=['TrxDate', 'CustomerName', 'ItemCode'],
            how='outer',
            suffixes=('_training', '_prediction')
        )

        return merged


# Global data loader instance
_data_loader: Optional[DataLoader] = None


def get_data_loader() -> DataLoader:
    """Get or create global data loader instance."""
    global _data_loader
    if _data_loader is None:
        _data_loader = DataLoader()
    return _data_loader
