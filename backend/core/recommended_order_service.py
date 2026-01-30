"""
Recommended Order Service with caching and Sunday date handling.
Generates recommended orders with buffer calculations based on demand patterns.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Optional, List, Dict, Any
import hashlib
import json


class RecommendedOrderService:
    """Service for generating recommended orders with caching."""

    def __init__(self, train_df: pd.DataFrame, pred_df: pd.DataFrame):
        """
        Initialize the service with training and prediction data.

        Args:
            train_df: Training data with historical sales
            pred_df: Prediction data with forecasts
        """
        # Ensure consistent data types for merge keys
        self.train_df = self._ensure_string_types(train_df.copy())
        self.pred_df = self._ensure_string_types(pred_df.copy())

        # Pre-compute historical metrics for all customer-item combinations
        self.hist_metrics = self._compute_historical_metrics()
        self.buying_cycle = self._compute_buying_cycle()
        self.customer_item_buying = self._compute_customer_item_buying()

    def _ensure_string_types(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Ensure merge key columns are strings to avoid merge errors.

        Args:
            df: DataFrame to process

        Returns:
            DataFrame with string types for key columns
        """
        string_cols = ['CustomerName', 'ItemCode', 'ItemName']
        for col in string_cols:
            if col in df.columns:
                df[col] = df[col].astype(str)
        return df

    def _ensure_sunday(self, date_str: str) -> str:
        """
        Convert any date to the Sunday END of that week.
        Week is Monday-Sunday, ending on Sunday.

        Args:
            date_str: Date string in YYYY-MM-DD format

        Returns:
            Sunday date string (week end) in YYYY-MM-DD format
        """
        try:
            date_obj = pd.to_datetime(date_str)
            # Convert to native Python datetime to avoid pandas integer issues
            if hasattr(date_obj, 'to_pydatetime'):
                date_obj = date_obj.to_pydatetime()

            # weekday(): Monday=0, Sunday=6
            # We want the Sunday that ENDS the week containing this date
            weekday = int(date_obj.weekday())  # Ensure native Python int
            days_to_sunday = (6 - weekday) % 7
            sunday = date_obj + timedelta(days=days_to_sunday)
            return sunday.strftime('%Y-%m-%d')
        except Exception as e:
            print(f"Error converting date to Sunday: {e}")
            raise ValueError(f"Invalid date format: {date_str}. Expected YYYY-MM-DD format.")

    def _compute_historical_metrics(self) -> pd.DataFrame:
        """Compute historical metrics (rolling averages, volatility, density)."""
        # Check if required columns exist
        required_cols = ["CustomerName", "ItemCode", "ItemName", "TotalQuantity", "TrxDate"]
        missing_cols = [col for col in required_cols if col not in self.train_df.columns]

        if missing_cols:
            print(f"Warning: Missing required columns in training data: {missing_cols}")
            return pd.DataFrame()

        if self.train_df.empty:
            print("Warning: Training data is empty")
            return pd.DataFrame()

        try:
            metrics = (
                self.train_df
                .sort_values("TrxDate")
                .groupby(["CustomerName", "ItemCode", "ItemName"])
                .agg(
                    avg_4w=("TotalQuantity", lambda x: x.tail(4).mean() if len(x) >= 4 else x.mean()),
                    avg_12w=("TotalQuantity", lambda x: x.tail(12).mean() if len(x) >= 12 else x.mean()),
                    avg_24w=("TotalQuantity", lambda x: x.tail(24).mean() if len(x) >= 24 else x.mean()),
                    avg_52w=("TotalQuantity", lambda x: x.tail(52).mean() if len(x) >= 52 else x.mean()),
                    mean_qty=("TotalQuantity", "mean"),
                    std_qty=("TotalQuantity", "std"),
                    non_zero_weeks=("TotalQuantity", lambda x: (x > 0).sum()),
                    total_weeks=("TotalQuantity", "count")
                )
                .reset_index()
            )

            # Handle division by zero for CV
            metrics["CV"] = metrics["std_qty"] / metrics["mean_qty"].replace(0, np.nan)
            metrics["Density"] = metrics["non_zero_weeks"] / metrics["total_weeks"]

            # Fill NaN values with defaults
            metrics["CV"] = metrics["CV"].fillna(0)
            metrics["avg_4w"] = metrics["avg_4w"].fillna(0)
            metrics["avg_12w"] = metrics["avg_12w"].fillna(0)
            metrics["avg_24w"] = metrics["avg_24w"].fillna(0)
            metrics["avg_52w"] = metrics["avg_52w"].fillna(0)

            return metrics
        except Exception as e:
            print(f"Error computing historical metrics: {e}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()

    def _compute_buying_cycle(self) -> pd.DataFrame:
        """Calculate average buying cycle in weeks for each customer-item combination."""

        # Check if required columns exist
        if "TrxDate" not in self.train_df.columns or "TotalQuantity" not in self.train_df.columns:
            print("Warning: Missing required columns for buying cycle calculation")
            return pd.DataFrame()

        if self.train_df.empty:
            return pd.DataFrame()

        try:
            def calculate_cycle(df):
                df = df.sort_values("TrxDate")
                purchase_weeks = df[df["TotalQuantity"] > 0]["TrxDate"]

                if len(purchase_weeks) <= 1:
                    return np.nan

                gaps = purchase_weeks.diff().dt.days.div(7)
                return gaps.mean()

            buying_cycle = (
                self.train_df
                .groupby(["CustomerName", "ItemCode"], group_keys=False)
                .apply(calculate_cycle, include_groups=False)
                .reset_index(name="BuyingCycleWeeks")
            )

            return buying_cycle
        except Exception as e:
            print(f"Error computing buying cycle: {e}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()

    def _compute_customer_item_buying(self) -> pd.DataFrame:
        """Count purchase occurrences for each customer-item combination."""

        # Check if required columns exist
        required_cols = ["CustomerName", "ItemCode", "TotalQuantity"]
        missing_cols = [col for col in required_cols if col not in self.train_df.columns]

        if missing_cols:
            print(f"Warning: Missing required columns for customer-item buying: {missing_cols}")
            return pd.DataFrame()

        if self.train_df.empty:
            return pd.DataFrame()

        try:
            customer_item_buying = (
                self.train_df[self.train_df["TotalQuantity"] > 0]
                .groupby(["CustomerName", "ItemCode"])
                .size()
                .reset_index(name="buy_count")
            )

            return customer_item_buying
        except Exception as e:
            print(f"Error computing customer-item buying: {e}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()

    def _calculate_buffer(self, row: pd.Series) -> float:
        """
        Calculate buffer percentage based on demand pattern, confidence, and CV.

        Args:
            row: DataFrame row with demand pattern info

        Returns:
            Buffer percentage (0-0.30 max)
        """
        buffer_pct = 0.0

        if row["Demand_Pattern"] == "Smooth":
            buffer_pct += 0.05 if row["Confidence"] == "High" else 0.10
        elif row["Demand_Pattern"] == "Intermittent":
            buffer_pct += 0.20
        else:  # Lumpy / Sparse
            buffer_pct += 0.05

        if row["Confidence"] == "Low":
            buffer_pct += 0.10

        if row["CV"] > 1:
            buffer_pct += 0.10

        return min(buffer_pct, 0.30)

    def _calculate_reason_code(self, row: pd.Series) -> str:
        """Generate reason code for the recommendation."""
        if row["buy_count"] == 0:
            return "New or rarely purchased item"
        elif row["Confidence"] == "Low":
            return "Low forecast confidence - safety buffer added"
        elif row["CV"] > 1:
            return "High demand volatility"
        else:
            return "Stable buying pattern"

    def generate_recommended_orders(
        self,
        target_date: str,
        customer_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate recommended orders for a specific date.

        Args:
            target_date: Target date (will be converted to Sunday if needed)
            customer_filter: Optional customer name filter

        Returns:
            Dictionary with recommended orders and metadata
        """
        # Convert to Sunday
        target_date = self._ensure_sunday(target_date)

        # Check if predictions data is available
        if self.pred_df is None or self.pred_df.empty:
            return {
                "success": False,
                "error": "Prediction data not available",
                "date": target_date,
                "data": [],
                "summary": None
            }

        # Check if required columns exist in predictions
        required_pred_cols = ["TrxDate", "CustomerName", "ItemCode", "ItemName", "Predicted",
                             "Confidence", "Demand_Pattern", "DataSplit", "TotalQuantity"]
        missing_pred_cols = [col for col in required_pred_cols if col not in self.pred_df.columns]

        if missing_pred_cols:
            return {
                "success": False,
                "error": f"Missing required columns in predictions: {missing_pred_cols}",
                "date": target_date,
                "data": [],
                "summary": None
            }

        # Filter predictions for target date - include both Test and Forecast
        # We'll prefer Test data per item, but show Forecast when Test doesn't exist
        all_data = self.pred_df[self.pred_df["TrxDate"] == target_date].copy()

        if all_data.empty:
            return {
                "success": False,
                "error": f"No prediction data available for date {target_date}",
                "date": target_date,
                "data": [],
                "summary": None
            }

        # For each customer-item combination, prefer Test data over Forecast
        # Test data has actual sales, Forecast is for future dates without actuals
        test_data = all_data[all_data["DataSplit"] == "Test"].copy()
        forecast_data = all_data[all_data["DataSplit"] == "Forecast"].copy()

        print(f"[DEBUG] Date {target_date}: Test rows={len(test_data)}, Forecast rows={len(forecast_data)}")

        # Create a combined dataframe preferring Test over Forecast
        # For each customer-item pair, if Test exists use it, otherwise use Forecast
        df = pd.concat([
            test_data,
            forecast_data[~forecast_data.set_index(['CustomerName', 'ItemCode']).index.isin(
                test_data.set_index(['CustomerName', 'ItemCode']).index
            )]
        ])

        print(f"[DEBUG] After preferring Test data: {len(df)} unique items")

        # Check if historical metrics are available
        if self.hist_metrics is not None and not self.hist_metrics.empty:
            df = df.merge(
                self.hist_metrics,
                on=["CustomerName", "ItemCode", "ItemName"],
                how="left"
            )
            # Fill NaN values from merge with defaults
            df["avg_4w"] = df["avg_4w"].fillna(0)
            df["avg_12w"] = df["avg_12w"].fillna(0)
            df["avg_24w"] = df["avg_24w"].fillna(0)
            df["avg_52w"] = df["avg_52w"].fillna(0)
            df["CV"] = df["CV"].fillna(0)
            df["Density"] = df["Density"].fillna(0)
        else:
            # Add default columns if metrics not available
            df["avg_4w"] = 0
            df["avg_12w"] = 0
            df["avg_24w"] = 0
            df["avg_52w"] = 0
            df["CV"] = 0
            df["Density"] = 0

        # Merge with buying cycle data if available
        if self.buying_cycle is not None and not self.buying_cycle.empty:
            df = df.merge(
                self.buying_cycle,
                on=["CustomerName", "ItemCode"],
                how="left"
            )
        else:
            df["BuyingCycleWeeks"] = np.nan

        # Merge with customer-item buying data if available
        if self.customer_item_buying is not None and not self.customer_item_buying.empty:
            df = df.merge(
                self.customer_item_buying,
                on=["CustomerName", "ItemCode"],
                how="left"
            )
        else:
            df["buy_count"] = 0

        df["buy_count"] = df["buy_count"].fillna(0)

        # Item selection (smart tiered filtering)
        # Must have purchase history AND either meaningful prediction OR high purchase frequency
        df = df[
            (df["buy_count"] > 0) &  # Must have purchase history
            (
                (df["Predicted"] >= 1) |  # At least 1 unit predicted
                (df["buy_count"] >= 10)   # OR core items (bought 10+ times)
            )
        ].copy()

        print(f"[DEBUG] After smart tiered filter: {len(df)} items (buy_count>0 AND (Predicted>=1 OR buy_count>=10))")

        # Apply customer filter if provided
        if customer_filter:
            df = df[df["CustomerName"] == customer_filter]

        # Actual quantity - set this FIRST before calculating BaseQty
        # Test data: shows actual sales
        # Forecast data: will be 0 or NaN (shows as "-" in UI)
        df["ActualQty"] = df["TotalQuantity"]

        # Calculate recommended order
        df["BufferPct"] = df.apply(self._calculate_buffer, axis=1)

        # Use the HIGHER of Actual or Predicted as the base
        # For Test data: if Actual > Predicted, use Actual (model underpredicted)
        # For Forecast data: use Predicted (no actuals yet)
        df["BaseQty"] = df[["ActualQty", "Predicted"]].max(axis=1)

        # Calculate buffer and recommendation
        df["BufferQty"] = (df["BaseQty"] * df["BufferPct"]).round(0)
        df["RecommendedOrderQty"] = (df["BaseQty"] + df["BufferQty"]).round(0)

        # Reason code
        df["ReasonCode"] = df.apply(self._calculate_reason_code, axis=1)

        # Select and sort columns
        result_df = df[
            [
                "TrxDate",
                "CustomerName",
                "ItemCode",
                "ItemName",
                "ActualQty",
                "Predicted",
                "BaseQty",
                "RecommendedOrderQty",
                "Confidence",
                "Demand_Pattern",
                "BuyingCycleWeeks",
                "avg_4w",
                "avg_12w",
                "avg_24w",
                "avg_52w",
                "BufferQty",
                "BufferPct",
                "Density",
                "CV",
                "ReasonCode",
                "buy_count"
            ]
        ].sort_values(
            ["CustomerName", "RecommendedOrderQty"],
            ascending=[True, False]
        )

        # Convert to list of dicts
        records = result_df.to_dict('records')

        # Create summary
        summary = {
            "date": target_date,
            "customers": result_df['CustomerName'].nunique(),
            "items": len(result_df),
            "total_order_qty": int(result_df['RecommendedOrderQty'].sum()),
            "total_predicted_qty": int(result_df['Predicted'].sum()),
            "total_buffer_qty": int(result_df['BufferQty'].sum()),
            "customer_filter": customer_filter or "All"
        }

        return {
            "success": True,
            "date": target_date,
            "data": records,
            "summary": summary
        }


# Global service instance cache
_service_cache: Dict[str, RecommendedOrderService] = {}


def get_recommended_order_service(train_df: pd.DataFrame, pred_df: pd.DataFrame) -> RecommendedOrderService:
    """
    Get or create the recommended order service instance.

    Args:
        train_df: Training data
        pred_df: Prediction data

    Returns:
        RecommendedOrderService instance
    """
    # Always create a new instance to ensure fresh data with correct types
    # The service is lightweight to create
    return RecommendedOrderService(train_df, pred_df)
