"""
Recommended order API endpoints - showing forecast results.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any

from data import get_data_loader

router = APIRouter()

data_loader = get_data_loader()


@router.get("/forecast/recommendations")
async def get_forecast_recommendations(
    customer: Optional[str] = Query(None, description="Filter by customer name"),
    item_code: Optional[str] = Query(None, description="Filter by item code"),
    start_week: Optional[str] = Query(None, description="Start week (Sunday date, YYYY-MM-DD)"),
    end_week: Optional[str] = Query(None, description="End week (Sunday date, YYYY-MM-DD)"),
    min_probability: float = Query(0.0, description="Minimum demand probability (0-1)"),
    confidence: Optional[str] = Query(None, description="Filter by confidence level (high/low)"),
    limit: int = Query(10000, description="Maximum number of records")
) -> List[Dict[str, Any]]:
    """
    Get forecast recommendations for future orders.

    This returns only data where DataSplit='Forecast', i.e., actual future predictions.
    """
    try:
        # Get all predictions and filter for forecast data
        predictions = data_loader.predictions

        # Filter for DataSplit='Forecast'
        forecast_data = predictions[predictions['DataSplit'] == 'Forecast'].copy()

        # Apply additional filters
        if customer:
            forecast_data = forecast_data[forecast_data['CustomerName'] == customer]
        if item_code:
            forecast_data = forecast_data[forecast_data['ItemCode'] == item_code]
        if start_week:
            forecast_data = forecast_data[forecast_data['TrxDate'] >= start_week]
        if end_week:
            forecast_data = forecast_data[forecast_data['TrxDate'] <= end_week]
        if confidence:
            forecast_data = forecast_data[forecast_data['Confidence'] == confidence]
        if min_probability > 0:
            forecast_data = forecast_data[forecast_data['Demand_Probability'] >= min_probability]

        # Sort by date and predicted quantity
        forecast_data = forecast_data.sort_values(['TrxDate', 'Predicted'], ascending=[True, False])

        # Apply limit
        if limit and len(forecast_data) > limit:
            forecast_data = forecast_data.head(limit)

        # Convert to list of dicts and sanitize
        records = forecast_data.to_dict('records')
        from data.data_loader import _sanitize_dict
        return [_sanitize_dict(record) for record in records]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast/historical")
async def get_historical_data(
    customer: Optional[str] = Query(None, description="Filter by customer name"),
    item_code: Optional[str] = Query(None, description="Filter by item code (can specify multiple)"),
    item_codes: Optional[List[str]] = Query(None, description="Filter by multiple item codes"),
    start_week: Optional[str] = Query(None, description="Start week (Sunday date, YYYY-MM-DD)"),
    end_week: Optional[str] = Query(None, description="End week (Sunday date, YYYY-MM-DD)"),
    data_split: Optional[str] = Query(None, description="Filter by data split (Train/Test)"),
    limit: int = Query(10000, description="Maximum number of records")
) -> List[Dict[str, Any]]:
    """
    Get historical training/test data.

    This returns only data where DataSplit is 'Train' or 'Test'.
    This is used for the Weekly Forecast view showing actual vs predicted for historical data.
    """
    try:
        predictions = data_loader.predictions

        # Filter for historical data (Train or Test)
        historical_data = predictions[
            (predictions['DataSplit'] == 'Train') | (predictions['DataSplit'] == 'Test')
        ].copy()

        # Apply additional filters
        if customer:
            historical_data = historical_data[historical_data['CustomerName'] == customer]

        # Handle single or multiple item codes
        if item_codes and len(item_codes) > 0:
            historical_data = historical_data[historical_data['ItemCode'].isin(item_codes)]
        elif item_code:
            historical_data = historical_data[historical_data['ItemCode'] == item_code]

        if start_week:
            historical_data = historical_data[historical_data['TrxDate'] >= start_week]
        if end_week:
            historical_data = historical_data[historical_data['TrxDate'] <= end_week]
        if data_split:
            historical_data = historical_data[historical_data['DataSplit'] == data_split]

        # Sort by date
        historical_data = historical_data.sort_values('TrxDate')

        # Apply limit
        if limit and len(historical_data) > limit:
            historical_data = historical_data.head(limit)

        # Convert to list of dicts and sanitize
        records = historical_data.to_dict('records')
        from data.data_loader import _sanitize_dict
        return [_sanitize_dict(record) for record in records]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
