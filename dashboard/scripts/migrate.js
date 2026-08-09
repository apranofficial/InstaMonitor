import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env.local");
  process.exit(1);
}

const DATA_DIR = path.join(process.cwd(), "data");
const HANDLERS_FILE = path.join(DATA_DIR, "handlers.json");
const CACHE_FILE = path.join(DATA_DIR, "scrape-cache.json");

// Define basic schemas inline for the script to avoid Next.js import issues
const HandlerSchema = new mongoose.Schema({
  handlerName: String,
  countryCode: String,
  phone: String,
  accounts: [String],
  monthlyPay: Number,
  currency: String,
  createdAt: Date,
  updatedAt: Date,
});

const PostSubSchema = new mongoose.Schema({
  timestamp: String,
  type: String,
  likesCount: Number,
  commentsCount: Number,
  url: String,
  caption: String,
  displayUrl: String,
}, { _id: false });

const ScrapeCacheSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  posts: [PostSubSchema],
  scrapedAt: Date,
});

const Handler = mongoose.models.Handler || mongoose.model("Handler", HandlerSchema);
const ScrapeCache = mongoose.models.ScrapeCache || mongoose.model("ScrapeCache", ScrapeCacheSchema);

async function run() {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, { dbName: "instamonitor" });
    console.log("✅ Connected to MongoDB.");

    // Migrate Handlers
    try {
      const handlersData = JSON.parse(await fs.readFile(HANDLERS_FILE, "utf-8"));
      console.log(`\n⏳ Found ${handlersData.length} handlers in handlers.json`);
      
      for (const h of handlersData) {
        const existing = await Handler.findOne({ phone: h.phone });
        if (existing) {
          console.log(`   ⏭️ Skipping handler ${h.handlerName} (already exists)`);
        } else {
          await Handler.create({
            handlerName: h.handlerName,
            countryCode: h.countryCode || "+91",
            phone: h.phone,
            accounts: h.accounts,
            monthlyPay: h.monthlyPay,
            currency: h.currency || "₹",
            createdAt: h.submittedAt || new Date(),
            updatedAt: h.submittedAt || new Date(),
          });
          console.log(`   ✅ Migrated handler ${h.handlerName}`);
        }
      }
    } catch (e) {
      console.log("⚠️ No handlers.json found or failed to parse. Skipping handlers migration.");
    }

    // Migrate Scrape Cache
    try {
      const cacheData = JSON.parse(await fs.readFile(CACHE_FILE, "utf-8"));
      const usernames = Object.keys(cacheData);
      console.log(`\n⏳ Found ${usernames.length} cached accounts in scrape-cache.json`);
      
      for (const username of usernames) {
        const { posts, scrapedAt } = cacheData[username];
        
        await ScrapeCache.findOneAndUpdate(
          { username },
          { username, posts, scrapedAt: scrapedAt || new Date() },
          { upsert: true, new: true }
        );
        console.log(`   ✅ Migrated scrape cache for @${username}`);
      }
    } catch (e) {
      console.log("⚠️ No scrape-cache.json found or failed to parse. Skipping scrape cache migration.");
    }

    console.log("\n🎉 Migration complete!");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  }
}

run();
