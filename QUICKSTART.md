# Quick Start Guide

## Prerequisites
- Python 3.10+ (you have Python 3.14.0 ✅)
- Conda (recommended) or pip (package manager)

## Step 1: Install Dependencies

### Option A: Using Conda (Recommended)

```bash
# Navigate to project directory
cd /Users/dianne/Desktop/MIT/FlexiMesh

# Create conda environment
conda create -n fleximesh python=3.10

# Activate conda environment
conda activate fleximesh

# Install Python dependencies
pip install -r requirements.txt
```

### Option B: Using Python venv

```bash
# Navigate to project directory
cd /Users/dianne/Desktop/MIT/FlexiMesh

# Create virtual environment
python3 -m venv fleximesh

# Activate virtual environment
source fleximesh/bin/activate  # On macOS/Linux
# or
fleximesh\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt
```

### Option C: Install Globally (Not Recommended)

```bash
# Navigate to project directory
cd /Users/dianne/Desktop/MIT/FlexiMesh

# Install Python dependencies
pip3 install -r requirements.txt
```

## Step 2: Run the Backend Server

**Important**: Make sure you're in the project root directory (`/Users/dianne/Desktop/MIT/FlexiMesh`) and your conda environment is activated.

### Option A: Run directly with Python
```bash
# From project root (not from backend directory)
cd /Users/dianne/Desktop/MIT/FlexiMesh
conda activate fleximesh
python backend/main.py
```

### Option B: Run with uvicorn (recommended for development)
```bash
# From project root - IMPORTANT: Must be in project root, not backend folder
cd /Users/dianne/Desktop/MIT/FlexiMesh
conda activate fleximesh
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag enables auto-reload on code changes.

**Troubleshooting `ModuleNotFoundError: No module named 'backend'`:**

This error occurs when Python can't find the backend module. Make sure:

1. **You're in the project root directory** (the folder containing both `backend/` and `frontend/` folders)
   ```bash
   # Check you're in the right place - you should see backend/ and frontend/ folders
   ls
   ```

2. **Your conda environment is activated**
   ```bash
   conda activate fleximesh
   # You should see (fleximesh) in your terminal prompt
   ```

3. **You're using the command from project root**, not from inside the backend folder:
   ```bash
   # ✅ Correct - from project root
   cd /Users/dianne/Desktop/MIT/FlexiMesh
   uvicorn backend.main:app --reload

   # ❌ Wrong - don't do this
   cd /Users/dianne/Desktop/MIT/FlexiMesh/backend
   uvicorn backend.main:app --reload  # This will fail!
   ```

4. **If still having issues**, try setting PYTHONPATH:
   ```bash
   export PYTHONPATH=/Users/dianne/Desktop/MIT/FlexiMesh:$PYTHONPATH
   uvicorn backend.main:app --reload
   ```

## Step 3: Access the Application

Once the server is running, open your browser and navigate to:

**http://localhost:8000**

You should see:
- Left side (40%): Prompt input form with "Enter text prompt that describes the 3D model you want:"
- Right side (60%): Empty Three.js scene with grid and axes

## Step 4: Test the Application

1. **Test the prompt input:**
   - Type a description in the textarea (e.g., "A red sports car")
   - Click "Confirm and Generate" button
   - Should transition to "Generating model..." stage

2. **Test keyboard shortcut:**
   - Type in the textarea
   - Press `Ctrl+Enter` (or `Cmd+Enter` on Mac) to submit

3. **Test validation:**
   - Try clicking "Confirm and Generate" without entering text
   - Should show an alert asking for a prompt

## Troubleshooting

### Port Already in Use
If port 8000 is already in use:
```bash
# Option 1: Kill the process using port 8000
lsof -ti:8000 | xargs kill -9

# Option 2: Use a different port
uvicorn backend.main:app --reload --port 8001
```

### Module Not Found Errors
If you see `ModuleNotFoundError`:
```bash
# Make sure conda environment is activated
conda activate fleximesh

# Install dependencies
pip install -r requirements.txt

# Or if using venv, make sure it's activated
source fleximesh/bin/activate
pip install -r requirements.txt
```

### CORS Errors
If you see CORS errors in the browser console, check that:
- Backend is running on the expected port
- Frontend is accessing the correct URL
- CORS origins in `backend/config.py` include your frontend URL

## Development Tips

### Auto-reload
The `--reload` flag automatically restarts the server when you change Python files.

### View API Documentation
FastAPI provides automatic API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Check Server Logs
The server logs all requests with timing information. Watch the terminal for:
- Request/response logs
- Error messages
- Processing times

### Browser Developer Tools
Open browser DevTools (F12) to:
- See console logs from frontend
- Check network requests
- Debug JavaScript errors

## Next Steps

After testing the prompt input stage, you can:
1. Implement the "generating" stage logic
2. Add model generation/loading functionality
3. Create additional stages for the workflow
