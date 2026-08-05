# InstaMonitor (Fleet Dashboard)

## 🚀 Motive of the Project
Managing a large portfolio of Instagram pages requires keeping track of content output, consistency, and overall account health. When managing 50+ public Instagram accounts, it becomes practically impossible to manually check if every single account is posting at the desired frequency.

**InstaMonitor (Fleet)** was built to solve this exact problem. It acts as a centralized command center to track and visualize the posting frequency of an entire fleet of Instagram pages.

## 🎯 Key Features
- **Bird's-Eye Visualization:** Features a GitHub-style Activity Heatmap and a Monthly Calendar view so you can see precisely how frequently an account is posting on any given day.
- **Automated Data Ingestion:** Uses a background process to seamlessly scrape public profiles (without requiring Instagram login credentials, utilizing Apify to stay ban-free).
- **Premium Glassmorphism UI:** Built with Next.js and styled using high-end, dynamic CSS variables and micro-animations for an exceptional user experience.
- **Account Filtering:** Easily isolate data for specific pages to see who is active and who is falling behind.

## 🛠️ Architecture
1. **Frontend:** Next.js (App Router) + Vanilla CSS (Glassmorphism design system)
2. **Data Fetching:** Apify Instagram Scraper API (using rotating residential proxies for flawless, ban-free execution)
3. **Database/Storage:** (Coming Soon - Phase 2) Cloud synchronization for historical caching.

## 📦 Setup & Usage

### 1. The Dashboard
The main user interface is located in the `/dashboard` directory.
```bash
cd dashboard
npm install
npm run dev
```

### 2. The Scraper Prototype
A standalone Node.js scraper test script is located in the root directory. To test it:
1. Copy your Apify API Token.
2. Set it as an environment variable: `export APIFY_API_TOKEN=your_token` (Linux/Mac) or `$env:APIFY_API_TOKEN="your_token"` (Windows PowerShell).
3. Run the script:
```bash
node test_scraper.js
```
