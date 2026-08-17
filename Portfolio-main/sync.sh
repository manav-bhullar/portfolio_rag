#!/bin/bash
# Description: Syncs the portfolio codebase to a remote destination while explicitly
# excluding heavy/redundant folders like node_modules, .next, and .git.

if [ "$#" -ne 2 ]; then
    echo "Usage: ./sync.sh <source> <destination>"
    echo "Example: ./sync.sh . user@server:/path/to/remote"
    exit 1
fi

SOURCE=$1
DEST=$2

echo "🔄 Starting sync from '$SOURCE' to '$DEST'..."

# We use rsync here, but this same exact exclusion logic applies to rclone bisync!
# Example for rclone: rclone bisync "$SOURCE" "$DEST" --exclude "node_modules/**" ...
rsync -av --progress \
    --exclude 'node_modules/' \
    --exclude '.next/' \
    --exclude '.git/' \
    --exclude 'package-lock.json' \
    "$SOURCE" "$DEST"

echo "✅ Sync complete!"
