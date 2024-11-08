# Use Node.js for building the frontend
FROM node:20-slim AS frontend-builder

# Debug: show current directory
WORKDIR /app/frontend
RUN pwd && ls -la

COPY frontend/package*.json ./
# Enable corepack and use yarn
RUN corepack enable && \
    yarn install

# Debug: show files after install
RUN ls -la

COPY frontend/ ./
# Debug: show files after frontend copy
RUN ls -la

RUN yarn build
# Debug: show files after build
RUN ls -la

# Switch to Python for the backend and serving
FROM python:3.12-slim

# Install nginx and poetry
RUN apt-get update && \
    apt-get install -y nginx curl && \
    curl -sSL https://install.python-poetry.org | python3 - && \
    rm -rf /var/lib/apt/lists/*

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Set up backend
WORKDIR /app/backend
COPY backend/pyproject.toml backend/poetry.lock ./

# Configure poetry and install dependencies
RUN /root/.local/bin/poetry config virtualenvs.create false && \
    /root/.local/bin/poetry install --no-interaction --no-ansi

# Copy backend code and built frontend
COPY backend/ .
COPY --from=frontend-builder /app/frontend/web-build/ /app/frontend/web-build/

# Copy startup script
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]