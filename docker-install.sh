#!/bin/bash

set -e

# Detect GPU availability
GPU_FLAG=""
COMPOSE_FILE="docker-compose.yml"

if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU detected — using GPU-enabled compose file"
    COMPOSE_FILE="docker-compose.yml"
else
    echo "No NVIDIA GPU detected — using CPU-only compose file"
    COMPOSE_FILE="docker-compose.cpu.yml"
fi

echo "Building Peritia Languages Docker images..."
docker-compose -f "$COMPOSE_FILE" build

echo "Starting Peritia Languages containers..."
docker-compose -f "$COMPOSE_FILE" up -d

echo ""
echo "Peritia Languages is now running!"
echo "  Frontend:      http://localhost:8080"
echo "  Voice Backend: http://localhost:5151"
echo ""
echo "Models will be downloaded automatically on first use."
echo "Check voice backend status: curl http://localhost:5151/api/voice/status"
echo ""
echo "Useful commands:"
echo "  docker-compose -f $COMPOSE_FILE logs -f           # View logs"
echo "  docker-compose -f $COMPOSE_FILE stop              # Stop"
echo "  docker-compose -f $COMPOSE_FILE restart            # Restart"
echo "  docker-compose -f $COMPOSE_FILE down               # Remove"
