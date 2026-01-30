# Deploy to Render - Step-by-Step Guide

This guide will help you deploy your Demand Forecast App to Render.

---

## Prerequisites

1. **Render Account** - Create a free account at https://render.com
2. **GitHub Account** - You'll need to push code to GitHub
3. **Groq API Key** - For AI insights feature

---

## Step 1: Push Code to GitHub

1. **Initialize Git repository** (if not already done):
   ```bash
   cd /d/Sasanka/Alkhair/webapp/webapp_experiment/demand-forecast-app
   git init
   git add .
   git commit -m "Initial commit - Demand Forecast App"
   ```

2. **Create a new repository on GitHub**:
   - Go to https://github.com/new
   - Name it: `demand-forecast-app`
   - Keep it private if you want
   - Don't initialize with README (you already have code)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/demand-forecast-app.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2: Deploy Backend on Render

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub account if not connected
   - Select the `demand-forecast-app` repository
   - Click "Connect"

3. **Configure Backend Service**:
   - **Name**: `demand-forecast-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Working Directory**: `backend` (important!)

4. **Add Environment Variables**:
   - Click "Advanced" → "Add Environment Variable"
   - Add: `GROQ_API_KEY` = your Groq API key
   - Add: `PYTHON_VERSION` = `3.11.7`

5. **Click "Create Web Service"**
   - Wait for deployment to complete
   - Copy the backend URL (e.g., `https://demand-forecast-backend.onrender.com`)

---

## Step 3: Deploy Frontend on Render

1. **Create another Web Service**:
   - Click "New +" → "Web Service"
   - Select the same repository
   - Click "Connect"

2. **Configure Frontend Service**:
   - **Name**: `demand-forecast-frontend`
   - **Environment**: `Static Site`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. **Add Environment Variable**:
   - Add: `VITE_API_URL` = your backend URL (from Step 2)
   - Example: `https://demand-forecast-backend.onrender.com`

4. **Click "Create Web Service"**
   - Wait for deployment

---

## Step 4: Update CORS Settings (Optional but Recommended)

After getting your frontend URL, update the CORS settings in `backend/main.py`:

```python
# In production, replace with your actual frontend URL
allow_origins=[
    "https://demand-forecast-frontend.onrender.com",
    "http://localhost:5173"  # for local development
]
```

Then push the changes:
```bash
git add .
git commit -m "Update CORS for production"
git push
```

---

## Step 5: Verify Deployment

1. **Check Backend Health**:
   - Go to `https://your-backend-url.onrender.com/health`
   - Should return: `{"status": "healthy", "data_loaded": true}`

2. **Check Frontend**:
   - Go to `https://your-frontend-url.onrender.com`
   - The app should load and display data

3. **Check API Docs**:
   - Go to `https://your-backend-url.onrender.com/docs`
   - Interactive API documentation (Swagger UI)

---

## Troubleshooting

### Backend fails to start
- Check logs in Render dashboard
- Verify Python version in `backend/runtime.txt`
- Ensure all dependencies are in `backend/requirements.txt`

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly
- Check CORS settings in `backend/main.py`
- Ensure backend is deployed and running

### Data files not found
- Ensure `data/raw/static/training_data_daily.csv` exists in repo
- Ensure `output_weekly/merged_predictions.csv` exists in repo
- Check `config.py` paths are correct

---

## Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `GROQ_API_KEY` | Backend | Groq API key for AI insights |
| `VITE_API_URL` | Frontend | Backend API URL |
| `PYTHON_VERSION` | Backend | Python version (3.11.7) |

---

## File Structure for Render

```
demand-forecast-app/
├── .gitignore
├── render.yaml
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   └── ...
├── backend/
│   ├── runtime.txt
│   ├── requirements.txt
│   └── main.py
├── config.py
├── data/
│   └── raw/static/
│       └── training_data_daily.csv
└── output_weekly/
    └── merged_predictions.csv
```

---

## Cost & Limits

Render Free Tier (as of 2025):
- **Free**: 750 hours/month of service
- **Backend**: Sleeps after 15 min of inactivity (cold start ~30s)
- **Frontend**: Always active (static site)

For production, consider:
- **Starter ($7/month)**: No sleep, better performance
- **Standard ($25/month)**: More resources

---

Need help? Check Render docs: https://render.com/docs
