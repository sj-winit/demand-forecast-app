"""
Weekly forecast API endpoints.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime

from data import get_data_loader

router = APIRouter()

data_loader = get_data_loader()


@router.get("/forecast/weekly")
async def get_weekly_forecast(
    customer: Optional[str] = Query(None, description="Filter by customer name"),
    item_code: Optional[str] = Query(None, description="Filter by item code"),
    start_week: Optional[str] = Query(None, description="Start week (Sunday date, YYYY-MM-DD)"),
    end_week: Optional[str] = Query(None, description="End week (Sunday date, YYYY-MM-DD)"),
    confidence: Optional[str] = Query(None, description="Filter by confidence level (high/low)"),
    pattern: Optional[str] = Query(None, description="Filter by demand pattern"),
    limit: int = Query(10000, description="Maximum number of records")
) -> List[Dict[str, Any]]:
    """
    Get weekly forecast data with optional filters.

    All weeks start on Sunday. Use the WeekLabel field for display.
    """
    try:
        predictions = data_loader.get_weekly_predictions(
            customer=customer,
            item_code=item_code,
            start_week=start_week,
            end_week=end_week,
            confidence=confidence,
            pattern=pattern
        )

        # Apply limit
        if limit and len(predictions) > limit:
            predictions = predictions[:limit]

        return predictions

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast/weekly/{week_start}/daily")
async def get_daily_breakdown(
    week_start: str,
    customer: str = Query(..., description="Customer name"),
    item_code: str = Query(..., description="Item code")
) -> List[Dict[str, Any]]:
    """
    Get daily breakdown for a specific week.

    This is a drill-down endpoint that shows daily data within a week.
    """
    try:
        daily_data = data_loader.get_daily_breakdown(
            week_start=week_start,
            customer=customer,
            item_code=item_code
        )

        return daily_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast/weeks")
async def get_available_weeks() -> Dict[str, Any]:
    """
    Get all available weeks in the forecast data.
    """
    try:
        if data_loader.predictions.empty:
            return {"weeks": []}

        weeks = sorted(data_loader.predictions['TrxDate'].unique())
        # Convert Timestamp to string
        weeks = [w.strftime('%Y-%m-%d') if hasattr(w, 'strftime') else str(w) for w in weeks]

        return {
            "weeks": weeks,
            "total_weeks": len(weeks),
            "first_week": weeks[0] if weeks else None,
            "last_week": weeks[-1] if weeks else None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast/summary")
async def get_forecast_summary() -> Dict[str, Any]:
    """
    Get summary statistics for forecast data.
    """
    try:
        if data_loader.predictions.empty:
            return {"message": "No data available"}

        predictions = data_loader.predictions

        # Handle date range - convert Timestamp to string
        start_date = predictions['TrxDate'].min()
        end_date = predictions['TrxDate'].max()
        if hasattr(start_date, 'strftime'):
            start_date = start_date.strftime('%Y-%m-%d')
            end_date = end_date.strftime('%Y-%m-%d')
        else:
            start_date = str(start_date)
            end_date = str(end_date)

        # Handle value_counts - convert to dict with proper types
        conf_dist = {}
        if 'Confidence' in predictions.columns:
            conf_counts = predictions['Confidence'].value_counts()
            conf_dist = {str(k): int(v) for k, v in conf_counts.items()}

        pattern_dist = {}
        if 'Demand_Pattern' in predictions.columns:
            pattern_counts = predictions['Demand_Pattern'].value_counts()
            pattern_dist = {str(k): int(v) for k, v in pattern_counts.items()}

        return {
            "total_predictions": len(predictions),
            "total_weeks": int(predictions['TrxDate'].nunique()),
            "total_customers": int(predictions['CustomerName'].nunique()),
            "total_items": int(predictions['ItemCode'].nunique()),
            "date_range": {
                "start": start_date,
                "end": end_date
            },
            "confidence_distribution": conf_dist,
            "pattern_distribution": pattern_dist
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
