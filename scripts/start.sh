#!/bin/bash

# Start the FastAPI backend
cd /app/backend
uvicorn src.server:app --host 0.0.0.0 --port 8000 &

# Start nginx
nginx -g "daemon off;"