
# 🏥 Weekly Wound Report - Deployment Guide

This application is built with React, Vite, and Google Gemini. Follow these steps to host it on GitHub for free.

## 🚀 Deployment to GitHub Pages

### 1. Create a GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository (e.g., `wound-report-app`).
2. Upload all your files to the `main` branch.

### 2. Set up your Secret API Key (CRITICAL)
Your API Key must **never** be typed directly into the code. 
1. Open your repository on GitHub.
2. Click **Settings** (top tab).
3. On the left sidebar, click **Secrets and variables** -> **Actions**.
4. Click **New repository secret**.
5. **Name**: `API_KEY`
6. **Value**: (Paste your Google Gemini API Key here).
7. Click **Add secret**.

### 3. Enable GitHub Pages
1. Go back to your repository **Settings**.
2. Click **Pages** on the left sidebar.
3. Under "Build and deployment" > "Branch", change the branch to `gh-pages` and folder to `/(root)`. 
   *(Note: The `gh-pages` branch will appear automatically after the first "Action" finishes).*
4. Click **Save**.

### 4. How the update works
Every time you upload ("Push") a change to the `main` branch, GitHub will:
1. Start a "Workflow" (look at the **Actions** tab).
2. Install your app and inject the secret `API_KEY`.
3. Create a clean `dist` folder.
4. Update your live website link.

---

## 🛠️ Local Development
If you want to run this on your own computer:
1. Ensure [Node.js](https://nodejs.org/) is installed.
2. Open terminal in the folder.
3. `npm install`
4. `npm run dev` (This will launch at http://localhost:5173)

**Important**: For local development, you must set an environment variable on your computer:
- **Windows (CMD)**: `set API_KEY=your_key_here && npm run dev`
- **Mac/Linux**: `export API_KEY=your_key_here && npm run dev`

---
**Medical Disclaimer**: This tool is for clinical documentation assistance. Ensure all usage complies with your facility's HIPAA and data privacy policies.
