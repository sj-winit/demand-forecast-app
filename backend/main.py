"""
Demand Forecast Analytics - FastAPI Backend
Weekly demand forecasting with Sunday-end weeks (Monday-Sunday).
Enhanced with logging for debugging.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Import config from current directory (for Render deployment)
import config

# Load environment variables FIRST before any imports that use them
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routes import weekly_forecast, analytics, recommended_order, sales_supervision, predictions, orders
from data import get_data_loader


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup - Validate paths first
    print("=" * 60)
    print("Demand Forecast Analytics - Starting Backend")
    print("=" * 60)
    print(f"Base Directory: {config.BASE_DIR}")
    print(f"Project Root: {config.PROJECT_ROOT}")
    print(f"Raw Data Directory: {config.RAW_DATA_DIR}")
    print(f"Output Directory: {config.OUTPUT_DIR}")
    print(f"Cache Directory: {config.CACHE_DIR}")
    print("-" * 60)

    # Validate that paths exist
    paths_valid = config.validate_paths()

    if not paths_valid:
        print("\n⚠ WARNING: Some data files are missing!")
        print("The application will start, but some features may not work.")
        print("Please ensure your data files are in the correct location.")
        print("-" * 60)

    print("\nLoading data...")
    data_loader = get_data_loader()

    # Sales supervision data
    if len(data_loader.daily) > 0:
        print(f"Loaded {len(data_loader.daily):,} daily sales records")
        print(f"  Date range: {data_loader.daily['TrxDate'].min()} to {data_loader.daily['TrxDate'].max()}")
    if len(data_loader.weekly) > 0:
        print(f"Loaded {len(data_loader.weekly):,} weekly sales records")
        print(f"  Date range: {data_loader.weekly['TrxDate'].min()} to {data_loader.weekly['TrxDate'].max()}")

    # Predictions data
    if len(data_loader.predictions) > 0:
        print(f"Loaded {len(data_loader.predictions):,} predictions")
        print(f"  Date range: {data_loader.predictions['TrxDate'].min()} to {data_loader.predictions['TrxDate'].max()}")
    else:
        print("Warning: No predictions data loaded!")
        print("Please ensure merged_predictions.csv is in the correct location:")
        print("  - D:/Sasanka/Alkhair/webapp/output_weekly/merged_predictions.csv")

    yield
    # Shutdown
    print("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Demand Forecast Analytics API",
    description="Weekly demand forecasting analytics with AI insights",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(weekly_forecast.router, prefix="/api", tags=["weekly-forecast"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(recommended_order.router, prefix="/api", tags=["recommended-order"])
app.include_router(sales_supervision.router, prefix="/api", tags=["sales-supervision"])
app.include_router(predictions.router, prefix="/api", tags=["predictions"])
app.include_router(orders.router, prefix="/api", tags=["orders"])


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Demand Forecast Analytics API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "weekly_forecast": "/api/forecast/weekly",
            "daily_breakdown": "/api/forecast/weekly/{week_start}/daily",
            "summary": "/api/analytics/summary",
            "customers": "/api/analytics/customers",
            "items": "/api/analytics/items",
            "predictions": "/api/predictions/data"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    data_loader = get_data_loader()
    return {
        "status": "healthy",
        "data_loaded": len(data_loader.predictions) > 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
