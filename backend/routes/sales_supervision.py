"""
Sales Supervision API endpoints.
Uses training data (actual sales) only - no predictions.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import pandas as pd

from data import get_data_loader

router = APIRouter()

data_loader = get_data_loader()


@router.get("/sales/training-data")
async def get_training_sales_data(
    customer: Optional[str] = Query(None, description="Filter by customer name"),
    item_code: Optional[str] = Query(None, description="Filter by item code"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    time_period: Optional[str] = Query(None, description="Time period: 1month, 3months, 6months, 1year"),
    limit: int = Query(10000, description="Maximum number of records")
) -> List[Dict[str, Any]]:
    """
    Get actual sales data from training data (no predictions).

    This queries the training_data_weekly.csv file directly using pandas.
    """
    try:
        if data_loader.weekly.empty:
            return []

        # Start with training data (no predictions)
        df = data_loader.weekly.copy()

        # Apply date filter based on time period
        if time_period and time_period != 'all':
            now = pd.Timestamp(datetime.now())
            cutoff_date = None

            if time_period == '1month':
                cutoff_date = now - timedelta(days=30)
            elif time_period == '3months':
                cutoff_date = now - timedelta(days=90)
            elif time_period == '6months':
                cutoff_date = now - timedelta(days=180)
            elif time_period == '1year':
                cutoff_date = now - timedelta(days=365)

            if cutoff_date:
                df = df[df['TrxDate'] >= cutoff_date]

        # Apply date range filters if specified
        if start_date:
            df = df[df['TrxDate'] >= pd.to_datetime(start_date)]
        if end_date:
            df = df[df['TrxDate'] <= pd.to_datetime(end_date)]

        # Apply customer filter
        if customer:
            df = df[df['CustomerName'] == customer]

        # Apply item filter
        if item_code:
            df = df[df['ItemCode'] == item_code]

        # Select and rename columns
        columns_to_select = ['TrxDate', 'ItemCode', 'ItemName', 'TotalQuantity']

        # Add CustomerID if available
        if 'CustomerID' in df.columns:
            columns_to_select.insert(1, 'CustomerID')

        # Add CustomerName if available
        if 'CustomerName' in df.columns:
            columns_to_select.insert(2, 'CustomerName')

        # Add optional columns if they exist
        if 'WeekLabel' in df.columns:
            columns_to_select.append('WeekLabel')
        if 'WeekRange' in df.columns:
            columns_to_select.append('WeekRange')

        result_df = df[columns_to_select].copy()

        # Sort by date
        result_df = result_df.sort_values('TrxDate')

        # Apply limit
        if limit and len(result_df) > limit:
            result_df = result_df.head(limit)

        # Convert to list of dicts and sanitize
        from data.data_loader import _sanitize_dict
        records = result_df.to_dict('records')
        return [_sanitize_dict(record) for record in records]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales/analytics")
async def get_sales_analytics(
    customer: Optional[str] = Query(None, description="Filter by customer name"),
    item_code: Optional[str] = Query(None, description="Filter by item code"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    time_period: Optional[str] = Query(None, description="Time period: 1month, 3months, 6months, 1year"),
    use_daily: bool = Query(False, description="Use daily data instead of weekly")
) -> Dict[str, Any]:
    """
    Get aggregated sales analytics from training data.

    Uses both training_data_weekly.csv and training_data_daily.csv.
    """
    try:
        # Choose data source based on use_daily flag
        if use_daily and not data_loader.daily.empty:
            df = data_loader.daily.copy()

            # Aggregate daily to week for consistency
            df['WeekStart'] = df['TrxDate'].apply(
                lambda x: x - pd.Timedelta(days=(x.weekday() + 1) % 7)
            )

            # Aggregate by week
            df = df.groupby(['WeekStart', 'CustomerName', 'ItemCode', 'ItemName']).agg({
                'TotalQuantity': 'sum'
            }).reset_index()
            df.rename(columns={'WeekStart': 'TrxDate'}, inplace=True)
            df['WeekLabel'] = df['TrxDate'].apply(
                lambda x: f"{x.strftime('%Y-%m-%d')}"
            )
        else:
            if data_loader.weekly.empty:
                return {}
            df = data_loader.weekly.copy()

        # Apply date filter based on time period
        if time_period and time_period != 'all':
            now = pd.Timestamp(datetime.now())
            cutoff_date = None

            if time_period == '1month':
                cutoff_date = now - pd.Timedelta(days=30)
            elif time_period == '3months':
                cutoff_date = now - pd.Timedelta(days=90)
            elif time_period == '6months':
                cutoff_date = now - pd.Timedelta(days=180)
            elif time_period == '1year':
                cutoff_date = now - pd.Timedelta(days=365)

            if cutoff_date is not None:
                df = df[df['TrxDate'] >= cutoff_date]

        # Apply date range filters if specified
        if start_date:
            df = df[df['TrxDate'] >= pd.to_datetime(start_date)]
        if end_date:
            df = df[df['TrxDate'] <= pd.to_datetime(end_date)]

        # Apply customer filter
        if customer:
            df = df[df['CustomerName'] == customer]

        # Apply item filter
        if item_code:
            df = df[df['ItemCode'] == item_code]

        # 1. Weekly volume aggregation
        weekly_volume = df.groupby('TrxDate').agg({
            'TotalQuantity': 'sum'
        }).reset_index()
        weekly_volume = weekly_volume.sort_values('TrxDate')

        # 2. Top items by volume
        item_volume = df.groupby(['ItemCode', 'ItemName']).agg({
            'TotalQuantity': 'sum'
        }).reset_index()
        item_volume = item_volume.sort_values('TotalQuantity', ascending=False)

        # 3. Customer distribution
        customer_volume = df.groupby('CustomerName').agg({
            'TotalQuantity': 'sum'
        }).reset_index()
        customer_volume = customer_volume.sort_values('TotalQuantity', ascending=False)

        # 4. Market share (Pareto analysis)
        total_volume = item_volume['TotalQuantity'].sum()
        item_volume['market_share_pct'] = (item_volume['TotalQuantity'] / total_volume * 100).round(2)

        # Calculate cumulative share
        item_volume = item_volume.sort_values('TotalQuantity', ascending=False)
        item_volume['cumulative_share_pct'] = item_volume['TotalQuantity'].cumsum() / total_volume * 100

        # Items contributing to 75% of volume
        top_75_percent_items = item_volume[item_volume['cumulative_share_pct'] <= 75]

        # 5. Weekly trends for line chart
        weekly_trends = df.groupby(['TrxDate', 'WeekLabel']).agg({
            'TotalQuantity': 'sum'
        }).reset_index()
        weekly_trends = weekly_trends.sort_values('TrxDate')

        # Convert to JSON-serializable format
        from data.data_loader import _sanitize_dict, _convert_to_serializable

        return {
            'data_source': 'daily' if use_daily else 'weekly',
            'summary': {
                'total_records': len(df),
                'total_volume': float(total_volume),
                'unique_items': len(item_volume),
                'unique_customers': len(customer_volume),
                'date_range': {
                    'start': str(df['TrxDate'].min()) if len(df) > 0 else None,
                    'end': str(df['TrxDate'].max()) if len(df) > 0 else None
                }
            },
            'weekly_trends': [
                {
                    'date': str(row['TrxDate']),
                    'week': str(row['WeekLabel']),
                    'volume': float(row['TotalQuantity'])
                }
                for _, row in weekly_trends.iterrows()
            ],
            'top_items': [
                {
                    'item_code': str(row['ItemCode']),
                    'item_name': str(row['ItemName']),
                    'total_quantity': float(row['TotalQuantity']),
                    'market_share_pct': float(row['market_share_pct']),
                    'cumulative_share_pct': float(row['cumulative_share_pct'])
                }
                for _, row in item_volume.head(20).iterrows()
            ],
            'top_75_percent_items': [
                {
                    'item_code': str(row['ItemCode']),
                    'item_name': str(row['ItemName']),
                    'total_quantity': float(row['TotalQuantity']),
                    'market_share_pct': float(row['market_share_pct']),
                    'cumulative_share_pct': float(row['cumulative_share_pct'])
                }
                for _, row in top_75_percent_items.iterrows()
            ],
            'customer_distribution': [
                {
                    'customer': str(row['CustomerName']),
                    'total_quantity': float(row['TotalQuantity']),
                    'market_share_pct': float(row['TotalQuantity'] / total_volume * 100)
                }
                for _, row in customer_volume.iterrows()
            ]
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
