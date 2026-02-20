# 🚀 Quick Start Guide

## Start the Development Server

### Method 1: Double-click the script (Easiest!)
1. Find `start-frontend.sh` in your project folder
2. Right-click → **Open With** → **Terminal**
3. Server will start automatically!

### Method 2: From VS Code Terminal
1. Open Terminal in VS Code (Ctrl + `)
2. Run:
   ```bash
   chmod +x start-frontend.sh
   ./start-frontend.sh
   ```

### Method 3: Manual Start
1. Open Terminal in VS Code (Ctrl + `)
2. Run these commands:
   ```bash
   cd frontend
   npm run dev
   ```

## Access the Application

Once the server is running, open your browser and go to:

**http://localhost:5173**

You should see:
```
VITE v5.4.21  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Test MMS Upload Feature

1. **Login** to your app
2. **Go to Messaging page**
3. Look for the new **"Attach Image or PDF (Max 5MB)"** button
4. Click and select a JPG, PNG, or PDF file
5. File will upload automatically
6. Type your message
7. Select recipients
8. Click **Send** - it will send as MMS!

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Dependencies Missing
```bash
cd frontend
npm install
npm run dev
```

## Stop the Server

Press `Ctrl + C` in the terminal
