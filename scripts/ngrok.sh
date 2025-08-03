#!/bin/bash

# ngrok script that manages SITE_URL environment variable in Convex
# Usage: ./scripts/ngrok.sh

set -e

NGROK_DOMAIN="bird-genuine-stork.ngrok-free.app"
NGROK_URL="https://$NGROK_DOMAIN"
LOCALHOST_URL="http://localhost:3000"

echo "🚀 Starting ngrok with Convex environment management..."

# Get current SITE_URL value (if it exists)
echo "📋 Getting current SITE_URL from Convex..."
CURRENT_SITE_URL=$(npx convex env get SITE_URL 2>/dev/null || echo "$LOCALHOST_URL")
echo "Current SITE_URL: $CURRENT_SITE_URL"

# Set SITE_URL to ngrok domain
echo "🔧 Setting SITE_URL to ngrok domain..."
npx convex env set SITE_URL "$NGROK_URL"
echo "✅ SITE_URL set to: $NGROK_URL"

# Function to restore original SITE_URL on exit
cleanup() {
    echo ""
    echo "🔄 Restoring original SITE_URL..."
    npx convex env set SITE_URL "$LOCALHOST_URL"
    echo "✅ SITE_URL restored to: $LOCALHOST_URL"
    echo "👋 Goodbye!"
}

# Set trap to run cleanup on script exit (Ctrl+C, kill, or normal exit)
trap cleanup EXIT INT TERM

echo "🌐 Starting ngrok tunnel..."
echo "Press Ctrl+C to stop ngrok and restore SITE_URL"
echo ""

# Run ngrok (this will block until interrupted)
ngrok http 8080 --domain "$NGROK_DOMAIN" 