# Stage 1: Build the React frontend
FROM node:20 AS builder

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the backend and frontend with Python/FastAPI
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY server.py .
COPY data.json .

# Copy built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 8000

# Run the FastAPI server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
