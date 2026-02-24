#!/bin/bash
# Start the voice backend for local development (without Docker)
# Requires Python 3.11+

set -e

echo "Setting up Peritia Voice Backend..."

cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "Starting voice backend on http://localhost:5151"
echo "Models will be auto-downloaded on first use."
echo ""

python -m uvicorn backend.main:app --host 0.0.0.0 --port 5151 --reload
