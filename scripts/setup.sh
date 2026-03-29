#!/bin/bash

echo "Setting up AI-NAD..."

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating .env file..."
    echo ""
    echo "Choose your AI service:"
    echo "1) Gemini API (Recommended - requires API key)"
    echo "2) Ollama (Local - requires installation)"
    read -p "Enter choice [1 or 2]: " choice
    
    if [ "$choice" = "1" ]; then
        read -p "Enter your Gemini API key: " api_key
        cat > backend/.env << EOF
PORT=5000
AI_SERVICE_TYPE=gemini
GEMINI_API_KEY=${api_key}
GEMINI_MODEL=gemini-pro
NODE_ENV=development
EOF
        echo "✅ Configured for Gemini API"
    elif [ "$choice" = "2" ]; then
        # Check if Ollama is installed
        if ! command -v ollama &> /dev/null; then
            echo "⚠️  Ollama is not installed. Please install it from https://ollama.ai"
            echo "After installation, run: ollama pull deepseek-coder"
        fi
        
        # Check if Ollama is running
        if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo "⚠️  Ollama is not running. Please start Ollama first: ollama serve"
        fi
        
        cat > backend/.env << EOF
PORT=5000
AI_SERVICE_TYPE=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder
NODE_ENV=development
EOF
        echo "✅ Configured for Ollama"
        
        # Check if model is available
        if command -v ollama &> /dev/null && ollama list 2>/dev/null | grep -q "deepseek-coder"; then
            echo "✅ Ollama model found"
        else
            echo "📥 To use Ollama, run: ollama pull deepseek-coder"
        fi
    else
        echo "Invalid choice. Using Gemini as default (you'll need to set GEMINI_API_KEY)"
        cp backend/.env.example backend/.env
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Backend: npm run dev:backend"
echo "  2. Frontend: npm run dev:frontend"
echo ""
echo "Note: Make sure to set your GEMINI_API_KEY in backend/.env if using Gemini"


