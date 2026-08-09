import mongoose from "mongoose";

const PostSubSchema = new mongoose.Schema(
  {
    timestamp: { type: String, default: null },
    type: { type: String, default: null },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    url: { type: String, default: null },
    caption: { type: String, default: "" },
    displayUrl: { type: String, default: null },
    viewsCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ScrapeCacheSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  posts: {
    type: [PostSubSchema],
    default: [],
  },
  followersCount: { type: Number, default: 0 },
  statsHistory: [
    {
      date: { type: Date, required: true },
      followersCount: { type: Number, required: true },
      totalLikes: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
      totalPosts: { type: Number, default: 0 },
    },
  ],
  scrapedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.ScrapeCache ||
  mongoose.model("ScrapeCache", ScrapeCacheSchema);
