#!/bin/bash

echo "============================================="
echo "   J.A.R.V.I.S. Initializer & Setup Script   "
echo "============================================="

# 1. Install Worker Dependencies
if [ -d "worker" ]; then
    echo "Installing Cloudflare Worker dependencies..."
    cd worker
    npm install
    
    echo ""
    echo "---------------------------------------------"
    echo "Dependency installation complete!"
    echo "---------------------------------------------"
    echo "To deploy your Cloudflare Worker proxy, please do the following:"
    echo "1. Inside the 'worker' directory, run: npx wrangler secret put GEMINI_API_KEY"
    echo "   (Paste your Gemini API key when prompted)"
    echo "2. Run: npx wrangler deploy"
    echo "3. Copy the URL that Wrangler generates and update the WORKER_URL variable in your index.html file."
    echo ""
    echo "To run locally, you can use: python3 -m http.server 8000 in this root directory."
else
    echo "Error: 'worker' directory not found. Please ensure you are running this from the root of the Jarvis project."
fi
