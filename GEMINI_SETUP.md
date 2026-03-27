# Gemini API Setup Guide

This guide will help you set up AI-NAD to use Google's Gemini API instead of Ollama.

## Why Use Gemini API?

- ✅ **No local installation required** - Just need an API key
- ✅ **Better model capabilities** - Advanced reasoning and coding abilities
- ✅ **Cloud-based** - No need to manage local models
- ✅ **Free tier available** - Google provides free API credits
- ✅ **Faster setup** - Get started in minutes

## Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (starts with `AIza...`)

## Step 2: Configure Environment

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and set:
   ```env
   AI_SERVICE_TYPE=gemini
   GEMINI_API_KEY=your-actual-api-key-here
   GEMINI_MODEL=gemini-1.5-flash
   ```

   Replace `your-actual-api-key-here` with the API key you copied.

## Step 3: Install Dependencies

```bash
# From project root
npm run install:all
```

This will install the `@google/generative-ai` package needed for Gemini.

## Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

## Available Gemini Models

You can change the model in your `.env` file:

- `gemini-1.5-flash` - Fast and efficient (default, recommended)
- `gemini-1.5-pro` - More capable, better for complex tasks
- `gemini-2.0-flash` - Latest model (if available)

## Testing Your Setup

1. Open http://localhost:3000
2. Enter a test prompt like: "Create a simple todo app"
3. Click "Generate Project"
4. If you see "Processing..." and then "Project Generated", your setup is working!

## Troubleshooting

### Error: "GEMINI_API_KEY is required"

- Make sure you've set `GEMINI_API_KEY` in `backend/.env`
- Verify there are no extra spaces or quotes around the key
- Ensure `AI_SERVICE_TYPE=gemini` is set

### Error: "API key not valid"

- Verify your API key is correct
- Check that you copied the entire key
- Ensure you haven't exceeded your API quota

### Error: "Model not found"

- Try using `gemini-pro` (the default)
- Check [Google AI Studio](https://makersuite.google.com/app/apikey) for available models
- Some models may require special access

### Rate Limiting

If you hit rate limits:
- The free tier has usage limits
- Consider upgrading to a paid plan
- Or switch to Ollama for unlimited local usage

## Switching Back to Ollama

If you want to use Ollama instead:

1. Edit `backend/.env`:
   ```env
   AI_SERVICE_TYPE=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=deepseek-coder
   ```

2. Make sure Ollama is installed and running
3. Restart the backend server

## Security Note

⚠️ **Never commit your API key to version control!**

- The `.env` file is already in `.gitignore`
- Keep your API key private
- If you share the project, use `.env.example` without the actual key

## Next Steps

Once Gemini is configured:
1. Start generating projects!
2. Try different prompts to see what AI-NAD can create
3. Check the generated projects in `generated-projects/` directory

Happy coding! 🚀

