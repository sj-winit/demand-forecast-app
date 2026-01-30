"""
Date utilities for weekly data processing.
All weeks END on Sunday (Monday-Sunday format).
"""
import pandas as pd
from datetime import datetime, timedelta
from typing import Tuple


def ensure_week_end_sunday(df: pd.DataFrame, date_column: str = 'TrxDate') -> pd.DataFrame:
    """
    Ensure all dates are normalized to Sunday (week end).

    Args:
        df: DataFrame with date column
        date_column: Name of the date column

    Returns:
        DataFrame with dates normalized to Sunday
    """
    df = df.copy()
    df[date_column] = pd.to_datetime(df[date_column])

    # Set to Sunday (week end) of each week
    # Monday=0, Tuesday=1, ..., Sunday=6
    # We want Sunday to be the end, so we add (6 - weekday)
    df[date_column] = df[date_column].apply(
        lambda x: x + pd.Timedelta(days=(6 - x.weekday()))
    )

    return df


def get_week_range(week_end_sunday: str) -> str:
    """
    Given a Sunday date (week end), return the formatted week range.

    Args:
        week_end_sunday: Sunday date string (week end)

    Returns:
        Formatted string like "Jan 22 - Jan 28, 2025"
    """
    date = pd.to_datetime(week_end_sunday)
    start = date - pd.Timedelta(days=6)  # Monday
    end = date  # Sunday

    return f"{start.strftime('%b %d')} - {end.strftime('%b %d, %Y')}"


def get_week_end_from_date(date_str: str) -> str:
    """
    Get the Sunday end of the week for any given date.

    Args:
        date_str: Any date string

    Returns:
        Sunday date as string (week end)
    """
    date = pd.to_datetime(date_str)
    week_end = date + pd.Timedelta(days=(6 - date.weekday()))
    return week_end.strftime('%Y-%m-%d')


def get_week_start_from_date(date_str: str) -> str:
    """
    Get the Monday start of the week for any given date.

    Args:
        date_str: Any date string

    Returns:
        Monday date as string (week start)
    """
    date = pd.to_datetime(date_str)
    week_start = date - pd.Timedelta(days=date.weekday())
    return week_start.strftime('%Y-%m-%d')


def get_all_weeks_in_range(start_date: str, end_date: str) -> list[str]:
    """
    Get all Sunday end dates between two dates.

    Args:
        start_date: Start date string
        end_date: End date string

    Returns:
        List of Sunday date strings (week ends)
    """
    start = pd.to_datetime(start_date)
    end = pd.to_datetime(end_date)

    # Convert start to the Sunday of that week
    start = start + pd.Timedelta(days=(6 - start.weekday()))

    weeks = []
    current = start
    while current <= end:
        weeks.append(current.strftime('%Y-%m-%d'))
        current += pd.Timedelta(days=7)

    return weeks


def get_week_number(date_str: str) -> int:
    """
    Get the week number for a given date (Monday-Sunday week).

    Args:
        date_str: Date string

    Returns:
        Week number (1-52 or 53)
    """
    date = pd.to_datetime(date_str)
    # Get Monday start of the week
    week_start = date - pd.Timedelta(days=date.weekday())

    # Get first Monday of the year
    jan_1 = pd.Timestamp(year=date.year, month=1, day=1)
    first_monday = jan_1 + pd.Timedelta(days=(7 - jan_1.weekday()) % 7)

    # Calculate week number
    week_num = ((week_start - first_monday).days // 7) + 1
    return max(1, min(week_num, 53))


def format_week_label(week_end: str, short: bool = False) -> str:
    """
    Format a week end date into a readable label.

    Args:
        week_end: Sunday date string (week end)
        short: If True, use short format (e.g., "Jan 22-28")

    Returns:
        Formatted week label
    """
    if short:
        date = pd.to_datetime(week_end)
        start = date - pd.Timedelta(days=6)
        return f"{start.strftime('%b %d')}-{date.strftime('%d')}"

    return get_week_range(week_end)
