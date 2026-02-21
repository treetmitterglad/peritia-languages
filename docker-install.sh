#!/bin/bash

set -e

echo "Building Peritia Languages Docker image..."
docker-compose build

echo "Starting Peritia Languages container..."
docker-compose up -d

echo ""
echo "Peritia Languages is now running!"
echo "Access the application at: http://localhost:8080"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f    # View logs"
echo "  docker-compose stop       # Stop the container"
echo "  docker-compose restart    # Restart the container"
echo "  docker-compose down       # Stop and remove the container"
