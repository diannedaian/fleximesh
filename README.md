# FlexiMesh

A full-stack 3D scene management application built with FastAPI and Three.js.

## Architecture

- **Backend**: FastAPI (Python 3.10+) with modular structure
- **Frontend**: Vanilla JavaScript (ES6 Modules) with Three.js
- **3D Engine**: Three.js for 3D rendering and model loading

## Project Structure

```
FlexiMesh/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── models.py            # Pydantic models
│   ├── config.py             # Configuration management
│   ├── middleware.py         # Custom middleware (logging, error handling)
│   └── routes/
│       ├── __init__.py
│       ├── api.py            # API routes
│       └── health.py         # Health check routes
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js           # Application entry point
│   │   ├── state.js           # State management
│   │   ├── ThreeScene.js     # Three.js scene manager
│   │   ├── StageManager.js   # UI stage manager
│   │   ├── config.js          # Frontend configuration
│   │   ├── utils/
│   │   │   ├── api.js         # API service layer
│   │   │   └── logger.js      # Logging utility
│   │   └── stages/
│   │       ├── BaseStage.js   # Base stage class
│   │       └── PromptStage.js # Prompt input stage
│   └── assets/               # 3D models and textures
└── requirements.txt
```

## Setup

### Backend

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
cd backend
python main.py
```

Or using uvicorn directly:
```bash
uvicorn backend.main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend

The frontend is served automatically by FastAPI. Open `http://localhost:8000` in your browser.

## Features

### Backend
- ✅ Modular architecture (models, routes, middleware separated)
- ✅ CORS support
- ✅ Request logging middleware
- ✅ Global error handling
- ✅ Health check endpoint
- ✅ Pydantic v2 models for validation

### Frontend
- ✅ ES6 module architecture
- ✅ Centralized state management
- ✅ API service layer with error handling
- ✅ Logging utility
- ✅ Stage-based UI system
- ✅ Three.js scene management
- ✅ GLTF/GLB model loading support

## API Endpoints

- `GET /` - Serves frontend index.html
- `GET /health` - Health check
- `GET /api/scene-data` - Get 3D scene object data

## Development

### Environment Variables

Create a `.env` file (optional):
```
HOST=0.0.0.0
PORT=8000
DEBUG=true
LOG_LEVEL=DEBUG
```

### Adding New Stages

1. Create a new stage class extending `BaseStage`:
```javascript
import { BaseStage } from './stages/BaseStage.js';

export class MyStage extends BaseStage {
    render() {
        // Implement render logic
    }
}
```

2. Register it in `StageManager`:
```javascript
import { MyStage } from './stages/MyStage.js';
stageManager.registerStage('my-stage', MyStage);
```

## Debugging

- Backend logs are output to console with timestamps
- Frontend uses the logger utility for consistent logging
- Check browser console for frontend logs
- API errors are caught and logged automatically

## License

MIT
