"""
Analytics API endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import logging

from data import get_data_loader
from core import get_llm_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

data_loader = get_data_loader()
llm_service = get_llm_service()


@router.get("/analytics/summary")
async def get_summary_metrics() -> Dict[str, Any]:
    """
    Get summary statistics for the dashboard.
    """
    logger.info("[ANALYTICS] Fetching summary metrics...")
    try:
        metrics = data_loader.get_summary_metrics()
        logger.info(f"[ANALYTICS] Summary metrics loaded: {len(metrics)} keys returned")
        logger.info(f"[ANALYTICS] Total predictions: {metrics.get('total_predictions', 0)}, "
                   f"Total weeks: {metrics.get('total_weeks', 0)}, "
                   f"Total customers: {metrics.get('total_customers', 0)}, "
                   f"Total items: {metrics.get('total_items', 0)}")
        return metrics

    except Exception as e:
        logger.error(f"[ANALYTICS] Error fetching summary metrics: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/customers")
async def get_customers() -> List[str]:
    """
    Get list of unique customers.
    """
    try:
        return data_loader.get_unique_customers()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/items")
async def get_items() -> List[Dict[str, str]]:
    """
    Get list of unique items with codes.
    """
    try:
        return data_loader.get_unique_items()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/patterns")
async def get_patterns() -> List[str]:
    """
    Get list of unique demand patterns.
    """
    try:
        return data_loader.get_demand_patterns()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/accuracy")
async def get_accuracy_metrics(
    customer: str = None,
    item_code: str = None,
    start_week: str = None,
    end_week: str = None
) -> Dict[str, Any]:
    """
    Get model accuracy metrics (MAE, RMSE, MAPE).
    """
    logger.info(f"[ANALYTICS] Fetching accuracy metrics - customer: {customer}, item: {item_code}, "
                f"start_week: {start_week}, end_week: {end_week}")
    try:
        predictions = data_loader.get_weekly_predictions(
            customer=customer,
            item_code=item_code,
            start_week=start_week,
            end_week=end_week
        )

        logger.info(f"[ANALYTICS] Accuracy: Retrieved {len(predictions)} predictions")

        if not predictions:
            logger.warning("[ANALYTICS] Accuracy: No data available for the specified filters")
            return {"message": "No data available for the specified filters"}

        df = pd.DataFrame(predictions)

        # Filter out rows with missing values
        df = df.dropna(subset=['TotalQuantity', 'Predicted'])

        if len(df) == 0:
            logger.warning("[ANALYTICS] Accuracy: No valid data after dropping NaN values")
            return {"message": "No valid data for accuracy calculation"}

        # Calculate metrics
        actual = df['TotalQuantity'].values
        predicted = df['Predicted'].values

        mae = float(np.mean(np.abs(actual - predicted)))
        rmse = float(np.sqrt(np.mean((actual - predicted) ** 2)))

        # MAPE (avoid division by zero)
        mask = actual != 0
        if mask.sum() > 0:
            mape = float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)
        else:
            mape = None

        # Mean Absolute Scaled Error (optional)
        naive_forecast = np.roll(actual, 1)
        naive_forecast[0] = actual[0]
        naive_mae = np.mean(np.abs(actual - naive_forecast))
        mase = mae / naive_mae if naive_mae != 0 else None

        result = {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "mape": round(mape, 2) if mape is not None else None,
            "mase": round(mase, 2) if mase is not None else None,
            "n_samples": len(df),
            "mean_actual": round(float(np.mean(actual)), 2),
            "mean_predicted": round(float(np.mean(predicted)), 2)
        }

        logger.info(f"[ANALYTICS] Accuracy calculated - MAE: {result['mae']}, RMSE: {result['rmse']}, "
                   f"MAPE: {result['mape']}, Samples: {result['n_samples']}")
        return result

    except Exception as e:
        logger.error(f"[ANALYTICS] Error calculating accuracy: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/timeline")
async def get_timeline_data(
    customer: str = None,
    item_code: str = None,
    start_week: str = None,
    end_week: str = None
) -> List[Dict[str, Any]]:
    """
    Get timeline data for charts (actual vs predicted over time).
    """
    try:
        predictions = data_loader.get_weekly_predictions(
            customer=customer,
            item_code=item_code,
            start_week=start_week,
            end_week=end_week
        )

        # Group by week and aggregate
        if predictions:
            df = pd.DataFrame(predictions)
            df['TrxDate'] = pd.to_datetime(df['TrxDate'])

            # Group by week
            timeline = df.groupby('TrxDate').agg({
                'TotalQuantity': 'sum',
                'Predicted': 'sum',
                'Demand_Probability': 'mean'
            }).reset_index()

            timeline = timeline.sort_values('TrxDate')

            # Add week labels
            timeline['WeekLabel'] = timeline['TrxDate'].apply(
                lambda x: x.strftime('%b %d')
            )

            # Convert to list of dicts
            result = timeline.to_dict('records')

            # Convert dates
            for record in result:
                record['TrxDate'] = record['TrxDate'].strftime('%Y-%m-%d')

            return result

        return []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/confidence-by-week")
async def get_confidence_by_week(
    customer: str = None,
    item_code: str = None
) -> List[Dict[str, Any]]:
    """
    Get confidence level distribution by week.
    """
    try:
        predictions = data_loader.get_weekly_predictions(
            customer=customer,
            item_code=item_code
        )

        if predictions:
            df = pd.DataFrame(predictions)

            # Group by week and confidence
            confidence_week = df.groupby(['TrxDate', 'Confidence']).size().unstack(fill_value=0)

            result = []
            for week in confidence_week.index:
                result.append({
                    'week': week.strftime('%Y-%m-%d'),
                    'high': int(confidence_week.loc[week, 'high']) if 'high' in confidence_week.columns else 0,
                    'low': int(confidence_week.loc[week, 'low']) if 'low' in confidence_week.columns else 0
                })

            return result

        return []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analytics/ai-insights")
async def get_ai_insights(request: Dict[str, Any]) -> Dict[str, str]:
    """
    Get AI-powered insights using LLM.

    Request body should contain:
    - insight_type: Type of insight (trend_analysis, anomaly_detection, forecast_recommendation, pattern_explanation)
    - context: Dictionary with relevant data for the insight
    """
    try:
        insight_type = request.get('insight_type')
        context = request.get('context', {})

        if not insight_type:
            raise HTTPException(status_code=400, detail="insight_type is required")

        # Generate insight using LLM service
        insight = llm_service.generate_insight(insight_type, context)

        return {
            "insight_type": insight_type,
            "insight": insight
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
