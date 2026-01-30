"""
Prediction API endpoints.
Returns actual vs predicted data with test date filtering.
Enhanced with logging.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import logging

from data import get_data_loader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

data_loader = get_data_loader()
logger.info(f"[PREDICTIONS] Data loader initialized. Predictions empty: {data_loader.predictions.empty}")


@router.get("/predictions/data")
async def get_prediction_data(
    customer: Optional[str] = Query(None, description="Filter by customer name"),
    item_code: Optional[str] = Query(None, description="Filter by item code"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100000, description="Maximum number of records")
) -> List[Dict[str, Any]]:
    """
    Get prediction data comparing actual vs predicted quantities.

    Returns data from merged_predictions.csv with proper column mapping.
    Maps TotalQuantity to ActualQty and Predicted to PredictedQty.
    """
    logger.info(f"[PREDICTIONS] Fetching prediction data - customer: {customer}, item: {item_code}, "
                f"start: {start_date}, end: {end_date}, limit: {limit}")
    try:
        # Try to get predictions from merged_predictions.csv
        if not data_loader.predictions.empty:
            logger.info(f"[PREDICTIONS] Predictions DataFrame has {len(data_loader.predictions)} rows")

            # DEBUG: Check for item 1061101 before any filtering
            item_1061101_all = data_loader.predictions[
                (data_loader.predictions['ItemCode'] == '1061101') &
                (data_loader.predictions['DataSplit'] == 'Forecast')
            ]
            logger.info(f"[PREDICTIONS] DEBUG: Item 1061101 ALL forecast records in CSV: {len(item_1061101_all)}")
            if len(item_1061101_all) > 0:
                logger.info(f"[PREDICTIONS] DEBUG: Item 1061101 forecast dates: {sorted(item_1061101_all['TrxDate'].astype(str).tolist())}")

            df = data_loader.predictions.copy()

            logger.info(f"[PREDICTIONS] DataFrame columns: {df.columns.tolist()}")
            logger.info(f"[PREDICTIONS] DataFrame date range: {df['TrxDate'].min()} to {df['TrxDate'].max()}")

            # CRITICAL: Reset index BEFORE any operations to prevent misalignment
            df = df.reset_index(drop=True)

            # DEBUG: Check Dec 28 BEFORE column mapping
            dec28_before = df[(df['CustomerName'] == 'DanubeMarket') & (df['ItemCode'] == 1041500) & (df['TrxDate'] == '2025-12-28')]
            if len(dec28_before) > 0:
                logger.info(f"[PREDICTIONS] DEBUG BEFORE mapping - Dec 28 record:")
                for idx, row in dec28_before.iterrows():
                    logger.info(f"  Index {idx}: DataSplit={row['DataSplit']}, Predicted={row.get('Predicted', 'N/A')}")

            # Map columns: TotalQuantity -> ActualQty, Predicted -> PredictedQty
            # Also create TestDate based on DataSplit
            if 'TotalQuantity' in df.columns:
                df['ActualQty'] = df['TotalQuantity']
            if 'Predicted' in df.columns:
                df['PredictedQty'] = df['Predicted']

            # DEBUG: Check Dec 28 AFTER column mapping
            dec28_after = df[(df['CustomerName'] == 'DanubeMarket') & (df['ItemCode'] == 1041500) & (df['TrxDate'] == '2025-12-28')]
            if len(dec28_after) > 0:
                logger.info(f"[PREDICTIONS] DEBUG AFTER mapping - Dec 28 record:")
                for idx, row in dec28_after.iterrows():
                    logger.info(f"  Index {idx}: DataSplit={row['DataSplit']}, Predicted={row.get('Predicted', 'N/A')}, PredictedQty={row.get('PredictedQty', 'N/A')}")

            # Determine TestDate - find the last date where DataSplit='Test' exists
            # or use the last date in the dataset
            test_dates = df[df['DataSplit'] == 'Test']['TrxDate']
            if not test_dates.empty:
                test_date = test_dates.max()
                logger.info(f"[PREDICTIONS] Test date found: {test_date}")
            else:
                # If no Test split, use the max date in the dataset
                test_date = df['TrxDate'].max()
                logger.warning(f"[PREDICTIONS] No Test split found, using max date: {test_date}")
            df['TestDate'] = test_date

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

            # Reset index after filtering to prevent misalignment
            df = df.reset_index(drop=True)

            logger.info(f"[PREDICTIONS] After filtering: {len(df)} rows")

            # Convert ItemCode to string for consistent handling
            df['ItemCode'] = df['ItemCode'].astype(str)

            # DEBUG: Check for duplicates before deduplication
            duplicates = df[df.duplicated(subset=['CustomerName', 'ItemCode', 'TrxDate'], keep=False)]
            if len(duplicates) > 0:
                logger.warning(f"[PREDICTIONS] Found {len(duplicates)} duplicate rows:")
                for _, row in duplicates.iterrows():
                    logger.warning(f"  - {row['CustomerName']} | {row['ItemCode']} | {row['TrxDate']} | DataSplit: {row['DataSplit']}")

            # Check item 1061101 BEFORE deduplication
            item_before_dedupe = df[(df['ItemCode'] == '1061101') & (df['DataSplit'] == 'Forecast')]
            logger.info(f"[PREDICTIONS] BEFORE DEDUPE - Item 1061101 forecast: {len(item_before_dedupe)} records")
            logger.info(f"[PREDICTIONS] BEFORE DEDUPE - Item 1061101 dates: {sorted(item_before_dedupe['TrxDate'].astype(str).tolist())}")

            # Remove duplicate rows for same (CustomerName, ItemCode, TrxDate)
            # Priority order: Train > Test > Forecast
            # Create a priority mapping
            priority_map = {'Train': 1, 'Test': 2, 'Forecast': 3}
            df['_priority'] = df['DataSplit'].map(priority_map)

            df_before_dedupe = df.copy()
            df = df.sort_values('_priority')  # Sort by priority (lower number = higher priority)
            df = df.drop_duplicates(subset=['CustomerName', 'ItemCode', 'TrxDate'], keep='first')
            df = df.drop(columns=['_priority'])  # Remove temporary column

            duplicates_removed = len(df_before_dedupe) - len(df)
            if duplicates_removed > 0:
                logger.info(f"[PREDICTIONS] Removed {duplicates_removed} duplicate rows (priority: Train > Test > Forecast)")
            else:
                logger.info(f"[PREDICTIONS] No duplicates found")

            # Check item 1061101 AFTER deduplication
            item_after_dedupe = df[(df['ItemCode'] == '1061101') & (df['DataSplit'] == 'Forecast')]
            logger.info(f"[PREDICTIONS] AFTER DEDUPE - Item 1061101 forecast: {len(item_after_dedupe)} records")
            logger.info(f"[PREDICTIONS] AFTER DEDUPE - Item 1061101 dates: {sorted(item_after_dedupe['TrxDate'].astype(str).tolist())}")

            # DEBUG: Check item 1041500 Dec 28 record specifically
            item_1041500_dec28 = df[(df['ItemCode'] == '1041500') & (df['CustomerName'] == 'DanubeMarket') & (df['TrxDate'] == pd.Timestamp('2025-12-28'))]
            if len(item_1041500_dec28) > 0:
                logger.info(f"[PREDICTIONS] DEBUG - Dec 28, 2025 record for 1041500:")
                for idx, row in item_1041500_dec28.iterrows():
                    logger.info(f"  DataSplit: {row['DataSplit']}, Predicted: {row.get('PredictedQty', row.get('Predicted', 'N/A'))}")
            else:
                logger.warning("[PREDICTIONS] DEBUG - Dec 28, 2025 record NOT FOUND for 1041500!")

            # Select columns needed for Prediction dashboard
            columns_to_select = ['TrxDate', 'CustomerName', 'ItemCode', 'ItemName',
                                 'ActualQty', 'PredictedQty', 'Confidence', 'TestDate', 'DataSplit']

            # Filter to only include columns that exist
            available_columns = [col for col in columns_to_select if col in df.columns]
            result_df = df[available_columns].copy()
            logger.info(f"[PREDICTIONS] Selected columns: {available_columns}")

            # Sort by date descending (most recent first) so limit takes most recent data
            result_df = result_df.sort_values('TrxDate', ascending=False)

            # Check item 1061101 BEFORE limit
            item_before_limit = result_df[(result_df['ItemCode'] == '1061101') & (result_df['DataSplit'] == 'Forecast')]
            logger.info(f"[PREDICTIONS] BEFORE LIMIT - Item 1061101 forecast: {len(item_before_limit)} records")
            if len(item_before_limit) > 0:
                logger.info(f"[PREDICTIONS] BEFORE LIMIT - Total rows before limit: {len(result_df)}")

            # Apply limit (takes most recent records due to descending sort)
            if limit and len(result_df) > limit:
                logger.info(f"[PREDICTIONS] Applying limit: {len(result_df)} > {limit}, taking top {limit}")
                result_df = result_df.head(limit)
            else:
                logger.info(f"[PREDICTIONS] No limit applied: {len(result_df)} <= {limit}")

            # Check item 1061101 AFTER limit
            item_after_limit = result_df[(result_df['ItemCode'] == '1061101') & (result_df['DataSplit'] == 'Forecast')]
            logger.info(f"[PREDICTIONS] AFTER LIMIT - Item 1061101 forecast: {len(item_after_limit)} records")
            logger.info(f"[PREDICTIONS] AFTER LIMIT - Total rows after limit: {len(result_df)}")

            # Sort back to ascending for frontend consumption
            result_df = result_df.sort_values('TrxDate')

            # Convert to list of dicts and sanitize
            from data.data_loader import _sanitize_dict
            records = result_df.to_dict('records')

            logger.info(f"[PREDICTIONS] Returning {len(records)} records")

            # DEBUG: Check for item 1041500 in returned records
            item_1041500_returned = [r for r in records if r.get('ItemCode') == '1041500' and r.get('CustomerName') == 'DanubeMarket']
            if len(item_1041500_returned) > 0:
                logger.info(f"[PREDICTIONS] DEBUG: Item 1041500 DanubeMarket records: {len(item_1041500_returned)}")
                for r in item_1041500_returned:
                    logger.info(f"  - Date: {r.get('TrxDate')}, DataSplit: {r.get('DataSplit')}, PredictedQty: {r.get('PredictedQty')}")

                # Specifically check Dec 28
                dec28_records = [r for r in item_1041500_returned if '2025-12-28' in str(r.get('TrxDate', ''))]
                if len(dec28_records) > 0:
                    logger.warning(f"[PREDICTIONS] WARNING - Dec 28 found in returned records:")
                    for r in dec28_records:
                        logger.warning(f"    Date: {r.get('TrxDate')}, DataSplit: {r.get('DataSplit')}, PredictedQty: {r.get('PredictedQty')}")
                else:
                    logger.info(f"[PREDICTIONS] INFO - Dec 28 NOT in returned records (correct!)")

            # DEBUG: Log the actual dict being returned (before sanitization)
            if len(item_1041500_returned) > 0:
                logger.info(f"[PREDICTIONS] DEBUG - Actual dict for Dec 28 (before sanitize):")
                dec28_in_df = result_df[(result_df['ItemCode'] == '1041500') & (result_df['CustomerName'] == 'DanubeMarket') & (result_df['TrxDate'].astype(str).str.contains('2025-12-28'))]
                for idx, row in dec28_in_df.iterrows():
                    logger.info(f"  DF Index {idx}: DataSplit={row['DataSplit']}, PredictedQty={row['PredictedQty']}")

            # DEBUG: Check for item 1061101 in returned records
            item_1061101_returned = [r for r in records if r.get('ItemCode') == '1061101' and r.get('DataSplit') == 'Forecast']
            logger.info(f"[PREDICTIONS] DEBUG: Item 1061101 forecast records in RETURN: {len(item_1061101_returned)}")
            if len(item_1061101_returned) > 0:
                logger.info(f"[PREDICTIONS] DEBUG: Item 1061101 returned dates: {sorted([r['TrxDate'] for r in item_1061101_returned])}")

            return [_sanitize_dict(record) for record in records]
        else:
            # No predictions data available
            logger.warning("[PREDICTIONS] Predictions DataFrame is empty!")
            return []

    except Exception as e:
        logger.error(f"[PREDICTIONS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
