"""
LLM Prompts for AI-powered insights
"""

SYSTEM_PROMPT = """You are an expert demand forecasting analyst with deep knowledge in:
- Supply chain analytics
- Statistical forecasting models
- Demand pattern recognition
- Inventory optimization

Your role is to analyze demand forecasting data and provide actionable insights.
Be concise, specific, and data-driven in your responses."""


INSIGHTS_PROMPTS = {
    "trend_analysis": """
    Analyze the following demand forecasting data and provide insights on trends:

    Data Summary:
    - Total predictions: {total_predictions}
    - Date range: {start_date} to {end_date}
    - Average demand probability: {avg_probability:.2%}
    - High confidence predictions: {high_conf_pct:.1f}%

    Demand Pattern Distribution:
    {pattern_distribution}

    Please analyze:
    1. What are the key demand patterns and what do they indicate?
    2. How reliable are the forecasts based on confidence levels?
    3. What recommendations would you give for inventory planning?
    """,

    "anomaly_detection": """
    Analyze the following weekly demand data for anomalies:

    Week: {week}
    Customer: {customer}
    Item: {item}
    Actual Quantity: {actual}
    Predicted Quantity: {predicted}
    Demand Probability: {probability:.2%}
    Confidence: {confidence}
    Demand Pattern: {pattern}

    Please explain:
    1. Is there a significant deviation between actual and predicted?
    2. What factors might explain this deviation?
    3. Should this be flagged for further investigation?
    """,

    "forecast_recommendation": """
    Based on the following forecast, provide inventory recommendations:

    Item: {item}
    Current Week: {week}
    Predicted Demand: {predicted}
    Demand Probability: {probability:.2%}
    Confidence Interval: [{lower_bound}, {upper_bound}]
    Demand Pattern: {pattern}

    Provide recommendations on:
    1. Optimal order quantity
    2. Safety stock level
    3. Reorder considerations
    """,

    "pattern_explanation": """
    Explain the demand pattern "{pattern}" in the context of inventory management:

    For item: {item}
    Customer: {customer}

    Please cover:
    1. What does this pattern mean?
    2. What challenges does it present for forecasting?
    3. What strategies work best for this pattern type?
    """
}


def get_prompt(prompt_type: str, **kwargs) -> str:
    """
    Get a formatted prompt by type.

    Args:
        prompt_type: Type of prompt (trend_analysis, anomaly_detection, etc.)
        **kwargs: Variables to format into the prompt

    Returns:
        Formatted prompt string
    """
    if prompt_type not in INSIGHTS_PROMPTS:
        raise ValueError(f"Unknown prompt type: {prompt_type}")

    return INSIGHTS_PROMPTS[prompt_type].format(**kwargs)
