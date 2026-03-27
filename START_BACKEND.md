# Starting the Backend Server

## Quick Start

The backend server needs to be running for the frontend to work. Here's how to start it:

### Option 1: Using npm script (Recommended)

```bash
# From project root
npm run dev:backend

# Or from backend directory
cd backend
npm run dev
```

### Option 2: Using tsx directly

```bash
cd backend
npx tsx watch src/index.ts
```

## Verify Backend is Running

Once started, you should see:
```
[INFO] Server running on port 5000
```

You can also test it:
```bash
curl http://localhost:5000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## Troubleshooting

### Port 5000 Already in Use

If you get an error that port 5000 is in use:

1. Find what's using it:
   ```bash
   lsof -i :5000
   ```

2. Kill the process or change the port in `backend/.env`:
   ```env
   PORT=5001
   ```

3. Update frontend proxy in `frontend/vite.config.ts`:
   ```ts
   proxy: {
     '/api': {
       target: 'http://localhost:5001',
       ...
     }
   }
   ```

### Missing Dependencies

If you get module errors:
```bash
cd backend
npm install
```

### Missing Environment Variables

Make sure `backend/.env` exists and has:
```env
AI_SERVICE_TYPE=gemini
GEMINI_API_KEY=your-api-key-here
PORT=5000
```

## Running Both Frontend and Backend

You need **two terminals**:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

Then open http://localhost:3000 in your browser.

