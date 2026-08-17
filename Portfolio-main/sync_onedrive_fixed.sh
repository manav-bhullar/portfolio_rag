#!/bin/bash

LOCAL_DIR="/home/manav_bhullar/OneDrive-Codes"
REMOTE_DIR="onedrive:codes"
LOG_FILE="/home/manav_bhullar/onedrive-bisync.log"

echo "🔄 Starting Bidirectional Sync..."
echo "📂 Local Directory: $LOCAL_DIR"
echo "☁️  Remote Directory: $REMOTE_DIR"

rclone bisync "$LOCAL_DIR" "$REMOTE_DIR" \
    --exclude "node_modules/**" \
    --exclude ".next/**" \
    --exclude ".git/**" \
    --exclude "venv/**" \
    --exclude ".venv/**" \
    --exclude "env/**" \
    --exclude ".env/**" \
    --exclude "__pycache__/**" \
    --exclude "*.pyc" \
    --exclude "*.pyo" \
    --exclude ".DS_Store" \
    --exclude "dist/**" \
    --exclude "build/**" \
    --exclude "coverage/**" \
    --resync \
    -P --rc --rc-addr localhost:5572

if [ $? -eq 0 ]; then
    echo "✅ Sync completed successfully."
else
    echo "❌ Sync encountered an error. Check $LOG_FILE for details."
fi
