const Redis = require('ioredis');

// Mock Database wrapper
const db = {
  query: async (sql, params) => {
    if (sql.includes('INSERT INTO posts')) return { id: Date.now() };
    if (sql.includes('SELECT count FROM user_stats')) return 10000; // Mock normal user
    if (sql.includes('SELECT follower_id FROM follows')) return [{ follower_id: 101 }, { follower_id: 102 }];
    return [];
  }
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

const CELEBRITY_FOLLOWER_THRESHOLD = 50000;

class FeedService {
  
  /**
   * Called when a user creates a new post
   */
  async publishPost(userId, postContent) {
    // 1. Save post to primary SQL database
    const post = await db.query('INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *', [userId, postContent]);
    
    // 2. Determine Fan-out strategy based on follower count
    const followerCount = await db.query('SELECT count FROM user_stats WHERE user_id = $1', [userId]);

    if (followerCount > CELEBRITY_FOLLOWER_THRESHOLD) {
      // PULL MODEL: Do nothing here. The post is in the DB.
      // Followers will fetch this post at read-time during Feed Assembly.
      console.log(`Celebrity post saved. Avoiding Redis memory explosion.`);
    } else {
      // PUSH MODEL: Fan-out on write to all active followers' Redis timelines
      const followers = await db.query('SELECT follower_id FROM follows WHERE target_id = $1', [userId]);
      
      const pipeline = redis.pipeline();
      followers.forEach(follower => {
        const feedKey = `user_feed:${follower.follower_id}`;
        // Push post ID to the top of the follower's feed list
        pipeline.lpush(feedKey, post.id);
        // Keep feed cache bounded (e.g., max 500 posts per user)
        pipeline.ltrim(feedKey, 0, 499); 
      });
      await pipeline.exec();
      console.log(`Pushed post ${post.id} to ${followers.length} followers' feeds.`);
    }
    
    return post;
  }

  /**
   * Called when a user requests their feed
   */
  async generateUserFeed(userId, cursor = 0) {
    const feedKey = `user_feed:${userId}`;
    
    // 1. Fetch pre-computed standard feed from Redis
    const standardPostIds = await redis.lrange(feedKey, cursor, cursor + 20);
    
    // 2. Fetch recent celebrity posts the user follows (Pull Model)
    const celebrityPostIds = await db.query(`
      SELECT p.id FROM posts p
      JOIN follows f ON p.user_id = f.target_id
      JOIN user_stats s ON f.target_id = s.user_id
      WHERE f.follower_id = $1 AND s.count > $2
      ORDER BY p.created_at DESC LIMIT 20
    `, [userId, CELEBRITY_FOLLOWER_THRESHOLD]);

    // 3. Merge, sort, and hydrate the final feed
    const combinedIds = [...new Set([...standardPostIds, ...celebrityPostIds.map(row => row.id)])];
    
    // In reality, run a ranking algorithm here before hydration
    return combinedIds;
  }
}

module.exports = FeedService;
