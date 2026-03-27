# Gemini Model Names Reference

## Current Valid Models (2024)

The Gemini API has updated model names. Use these in your `.env` file:

### Recommended Models

1. **`gemini-1.5-flash`** (Default)
   - Fast and efficient
   - Good for most tasks
   - Lower latency
   - Recommended for code generation

2. **`gemini-1.5-pro`**
   - More capable than Flash
   - Better for complex reasoning
   - Higher quality outputs
   - Slightly slower

3. **`gemini-2.0-flash`** (If available)
   - Latest model
   - Best performance
   - May require special access

### Deprecated Models (Do Not Use)

- ❌ `gemini-pro` - No longer available
- ❌ `gemini-pro-vision` - Replaced by newer models
- ❌ `gemini-ultra` - Not available via standard API

## Configuration

In your `backend/.env` file:

```env
GEMINI_MODEL=gemini-1.5-flash
```

## Model Selection Guide

- **For speed**: Use `gemini-1.5-flash`
- **For quality**: Use `gemini-1.5-pro`
- **For latest features**: Try `gemini-2.0-flash` (if available)

## Troubleshooting

If you get a "model not found" error:
1. Verify the model name is correct (use one from the list above)
2. Check your API key has access to the model
3. Try `gemini-1.5-flash` as it's the most widely available

## Checking Available Models

You can check which models are available with your API key by visiting:
https://makersuite.google.com/app/apikey

Or use the Gemini API directly to list models.

