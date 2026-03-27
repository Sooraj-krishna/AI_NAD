# Automatic Gemini Model Detection

AI-NAD now automatically detects and uses available Gemini models from your API key.

## How It Works

1. **On First Request**: The system queries the Gemini API to list available models
2. **Model Selection**: It tries models in this order:
   - `gemini-1.5-flash` (fastest)
   - `gemini-1.5-pro` (more capable)
   - `gemini-2.0-flash` (latest)
   - Other available models
3. **Caching**: Once a working model is found, it's cached for future use
4. **Fallback**: If a model fails, it automatically retries with auto-detection

## Benefits

- ✅ **No Configuration Needed**: Works automatically with any valid API key
- ✅ **Always Uses Available Models**: Adapts to your API access level
- ✅ **Error Recovery**: Automatically switches models if one becomes unavailable
- ✅ **Performance**: Caches the result to avoid repeated API calls

## Manual Override

You can still manually set a model in `backend/.env`:

```env
GEMINI_MODEL=gemini-1.5-pro
```

If set, the auto-detection will be skipped and your specified model will be used.

## Logs

When auto-detection runs, you'll see:
```
🤖 Using auto-detected Gemini model: gemini-1.5-flash
```

Or if a model fails and it retries:
```
Model not found, attempting to auto-detect...
✅ Found available model: gemini-1.5-pro
```

## Troubleshooting

If auto-detection fails:
1. Check your API key is valid
2. Verify you have access to Gemini models
3. Try manually setting `GEMINI_MODEL` in `.env`
4. Check backend logs for detailed error messages

