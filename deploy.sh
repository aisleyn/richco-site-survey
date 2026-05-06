#!/bin/bash

# Exit on error
set -e

echo "Starting deployment..."

# Install Node dependencies
echo "Installing Node.js dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Set up Python and install dependencies
echo "Setting up Python dependencies..."
if command -v python3 &> /dev/null; then
  echo "Python 3 found at: $(which python3)"
  python3 -m pip install --upgrade pip
  python3 -m pip install -r requirements.txt
elif command -v python &> /dev/null; then
  echo "Python found at: $(which python)"
  python -m pip install --upgrade pip
  python -m pip install -r requirements.txt
else
  echo "Warning: Python not found in PATH"
fi

echo "Deployment completed successfully!"
