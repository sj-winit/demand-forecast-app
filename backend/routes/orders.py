"""
Demand Forecast API endpoints.
Generates van load recommendations with buffer calculations and caching.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Dict, Any
import pandas as pd
import numpy as np

from data import get_data_loader
from core import get_recommended_order_service

router = APIRouter()

# In-memory cache for generated recommendations
_recommendations_cache: Dict[str, Dict[str, Any]] = {}


def _sanitize_value(value: Any) -> Any:
    """
    Sanitize NaN values to None for JSON serialization.

    Args:
        value: Any value from a pandas DataFrame

    Returns:
        Sanitized value (NaN -> None)
    """
    if isinstance(value, float) and np.isnan(value):
        return None
    elif isinstance(value, np.floating):
        return float(value)
    elif isinstance(value, np.integer):
        return int(value)
    return value


def _sanitize_dict(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize a dictionary by converting NaN values to None.

    Args:
        record: Dictionary possibly containing NaN values

    Returns:
        Sanitized dictionary
    """
    return {k: _sanitize_value(v) for k, v in record.items()}


@router.get("/orders/recommended")
async def get_recommended_orders(
    target_date: str = Query(..., description="Target date (YYYY-MM-DD). Will be converted to Sunday if needed."),
    customer: Optional[str] = Query(None, description="Filter by customer name"),
    use_cache: bool = Query(True, description="Use cached results if available")
) -> Dict[str, Any]:
    """
    Get van load recommendations for a specific date.

    The endpoint:
    - Converts any input date to the Sunday of that week
    - Generates van load quantities with buffer calculations
    - Uses MAX(Actual, Predicted) to avoid under-recommending
    - Caches results for performance
    - Filters by customer if provided

    Returns:
        Dictionary with:
        - success: Boolean indicating if request was successful
        - date: The Sunday date used for recommendations
        - data: List of van load recommendation records
        - summary: Summary statistics
    """
    try:
        print(f"[DEBUG] Received request for target_date={target_date}, customer={customer}")

        data_loader = get_data_loader()
        print(f"[DEBUG] Data loader initialized. Predictions: {len(data_loader.predictions) if data_loader.predictions is not None else 0}, Weekly: {len(data_loader.weekly) if data_loader.weekly is not None else 0}")

        # Check if data is loaded
        if data_loader.predictions is None or len(data_loader.predictions) == 0:
            print("[DEBUG] Prediction data not available")
            return {
                "success": False,
                "error": "Prediction data not available. Please ensure the predictions file is loaded.",
                "date": target_date,
                "data": [],
                "summary": None
            }

        if data_loader.weekly is None or len(data_loader.weekly) == 0:
            print("[DEBUG] Weekly training data not available")
            return {
                "success": False,
                "error": "Weekly training data not available. Please ensure the training data file is loaded.",
                "date": target_date,
                "data": [],
                "summary": None
            }

        print("[DEBUG] Getting recommended order service...")
        service = get_recommended_order_service(
            data_loader.weekly,
            data_loader.predictions
        )
        print("[DEBUG] Service obtained successfully")

        # Create cache key
        cache_key = f"{target_date}_{customer or 'all'}"

        # Check cache if enabled
        if use_cache and cache_key in _recommendations_cache:
            print(f"[DEBUG] Returning cached result for {cache_key}")
            return _recommendations_cache[cache_key]

        print(f"[DEBUG] Generating recommendations for {target_date}...")
        # Generate recommendations
        result = service.generate_recommended_orders(
            target_date=target_date,
            customer_filter=customer
        )
        print(f"[DEBUG] Recommendations generated. Success: {result.get('success')}, Items: {len(result.get('data', []))}")

        # Sanitize data to remove NaN values
        if result["success"] and result.get("data"):
            result["data"] = [_sanitize_dict(record) for record in result["data"]]

        # Cache the result
        if result["success"]:
            _recommendations_cache[cache_key] = result

        return result

    except ValueError as e:
        print(f"[ERROR] ValueError: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[ERROR] Exception: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")


@router.get("/orders/customers")
async def get_customers() -> Dict[str, Any]:
    """
    Get list of unique customers from the data.

    Returns:
        Dictionary with list of customer names
    """
    try:
        data_loader = get_data_loader()
        customers = data_loader.predictions['CustomerName'].unique().tolist()
        customers.sort()

        return {
            "success": True,
            "customers": customers
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")


@router.get("/orders/dates")
async def get_available_dates(
    data_split: Optional[str] = Query(None, description="Filter by data split (Train/Test/Forecast)")
) -> Dict[str, Any]:
    """
    Get list of available dates for recommendations.

    Returns:
        Dictionary with list of available dates (Sundays)
    """
    try:
        data_loader = get_data_loader()
        dates_df = data_loader.predictions[['TrxDate', 'DataSplit']].copy()

        # Filter by data split if provided
        if data_split:
            dates_df = dates_df[dates_df['DataSplit'] == data_split]

        # Get unique dates and convert to Sunday
        unique_dates = dates_df['TrxDate'].unique()

        # Ensure all dates are Sundays and format
        sunday_dates = []
        for date in unique_dates:
            if pd.isna(date):
                continue
            date_obj = pd.to_datetime(date)
            # Find the Sunday of that week
            days_back_to_sunday = (date_obj.weekday() + 1) % 7
            sunday = date_obj - pd.Timedelta(days=days_back_to_sunday)
            sunday_dates.append(sunday.strftime('%Y-%m-%d'))

        # Get unique Sundays and sort
        sunday_dates = sorted(list(set(sunday_dates)))

        return {
            "success": True,
            "dates": sunday_dates,
            "count": len(sunday_dates)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dates: {str(e)}")


@router.delete("/orders/cache")
async def clear_cache() -> Dict[str, Any]:
    """
    Clear the recommendations cache.

    Returns:
        Dictionary confirming cache clear
    """
    global _recommendations_cache
    _recommendations_cache.clear()

    return {
        "success": True,
        "message": "Cache cleared successfully"
    }
