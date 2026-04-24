#!/bin/bash

# AI Wedding Planner - Start Script
# This script sets up and starts the full application

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║      💍 AI Wedding Planner - Starting        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# ── Clean up used ports ──
echo "🔧 Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."
cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "   Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}
cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo "   Ports cleaned."

# ── Check PostgreSQL ──
echo ""
echo "🐘 Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  echo "   Starting PostgreSQL..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  sleep 2
fi
echo "   PostgreSQL is running."

# ── Create database if not exists ──
DB_NAME=${DB_NAME:-ai_wedding_planner}
echo ""
echo "📦 Setting up database '$DB_NAME'..."
if ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  createdb "$DB_NAME" 2>/dev/null || true
  echo "   Database created."
else
  echo "   Database already exists."
fi

# ── Install backend dependencies ──
echo ""
echo "📥 Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1

# ── Seed database ──
echo ""
echo "🌱 Seeding database with demo data..."
node seed.js
echo ""

# ── Install frontend dependencies ──
echo ""
echo "📥 Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1

# ── Start backend with nodemon (auto-reload) ──
echo ""
echo "🚀 Starting backend server on port $BACKEND_PORT (with auto-reload)..."
cd "$PROJECT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!

# ── Start frontend (with auto-reload built-in) ──
echo "🚀 Starting frontend on port $FRONTEND_PORT (with auto-reload)..."
cd "$PROJECT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!

# ── Cleanup on exit ──
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo "   Goodbye! 💍"
}
trap cleanup EXIT INT TERM

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ AI Wedding Planner is starting up!      ║"
echo "║                                              ║"
echo "║   Frontend: http://localhost:$FRONTEND_PORT        ║"
echo "║   Backend:  http://localhost:$BACKEND_PORT        ║"
echo "║                                              ║"
echo "║   Demo Login:                                ║"
echo "║   Email: demo@weddingplanner.com             ║"
echo "║   Pass:  demo123456                          ║"
echo "║                                              ║"
echo "║   Press Ctrl+C to stop all services          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Wait for processes
wait
