# Demand Forecast Analytics

A weekly demand forecasting dashboard with AI-powered insights. Built with FastAPI (backend) and React + TypeScript (frontend).

## Features

- **Dashboard**: Overview of forecast metrics including weekly statistics, confidence levels, and demand patterns
- **Weekly Forecast**: Interactive view of weekly predictions with filtering and sorting
- **Daily Drill-Down**: Click any week to see daily breakdown of sales
- **AI Insights**: Get intelligent analysis powered by Groq's LLM API

## Project Structure

```
demand-forecast-app/
├── backend/                # FastAPI backend
│   ├── data/              # Data loading and utilities
│   │   ├── date_utils.py     # Weekly date handling (Sunday-start)
│   │   └── data_loader.py    # CSV data loading
│   ├── routes/            # API endpoints
│   │   ├── weekly_forecast.py
│   │   └── analytics.py
│   ├── core/              # LLM service
│   ├── prompts/           # AI prompt templates
│   └── main.py            # FastAPI app entry
│
├── src/                   # React frontend
│   ├── components/
│   │   ├── Dashboard/         # Metrics overview
│   │   ├── WeeklyForecast/    # Forecast table with charts
│   │   ├── AIInsights/        # AI-powered analysis
│   │   └── Common/            # Shared components
│   ├── services/          # API client
│   └── types/             # TypeScript definitions
│
├── data/                  # Data files
│   └── raw/static/        # Training data CSVs
│
└── output_weekly/         # Weekly predictions CSV
```

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- Your forecast data files (training_data_*.csv, merged_predictions.csv)

### 1. Prepare Data Files

Copy your data files to the appropriate locations:

```bash
# Create data directories
mkdir -p data/raw/static
mkdir -p output_weekly

# Copy your data files
cp /path/to/training_data_daily.csv data/raw/static/
cp /path/to/training_data_weekly.csv data/raw/static/
cp /path/to/merged_predictions.csv output_weekly/
```

### 2. Backend Setup

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Optional: Set up Groq API key for AI insights
cp ../.env.example ../.env
# Edit .env and add your GROQ_API_KEY
```

### 3. Frontend Setup

```bash
# Install Node dependencies
npm install

# Start development server
npm run dev
```

### 4. Start Backend Server

In a separate terminal:

```bash
# From project root
npm run backend

# Or manually:
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Weekly Data Handling

All weekly data uses **Sunday as the week start**. The system automatically:
- Converts daily data to weekly (Sunday-Saturday)
- Labels weeks as "Jan 8-14" format
- Aligns predictions with weekly aggregated training data

## Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your API key from: https://console.groq.com/keys

## Usage

1. **Dashboard**: View overall forecast metrics and demand patterns
2. **Weekly Forecast**:
   - Filter by customer, item, date range, confidence, or pattern
   - Click any row to see daily breakdown
   - View actual vs predicted chart
3. **AI Insights**:
   - Generate trend analysis
   - Detect anomalies
   - Get forecast recommendations
   - Understand demand patterns

## Building for Production

```bash
# Build frontend
npm run build

# The build output will be in dist/
```

## Technology Stack

### Backend
- FastAPI - Python web framework
- Pandas - Data processing
- Groq - LLM API for AI insights

### Frontend
- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool
- Tailwind CSS - Styling
- Chart.js + react-chartjs-2 - Charts
- Lucide React - Icons

## License

MIT
