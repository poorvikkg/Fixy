const Redis = require('ioredis');

// Simulated Kafka consumer loop
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const processNotification = async (event) => {
  const idempotencyKey = `notif_${event.eventId}`;

  // 1. Deduplication using Redis SETNX (Set if Not eXists)
  // Prevents sending the same push notification twice if Kafka re-delivers
  const isNew = await redis.set(idempotencyKey, 'processing', 'EX', 86400, 'NX');
  
  if (!isNew) {
    console.log(`Duplicate event ${event.eventId} ignored.`);
    return; 
  }

  // 2. Fetch User Preferences (Do Not Disturb, Email vs Push)
  const prefs = { dndEnabled: false }; // Mock fetch
  if (prefs.dndEnabled) return;

  // 3. Send out notification via Firebase Cloud Messaging (FCM)
  console.log(`Push notification sent to device ${event.deviceToken}: ${event.title}`);
};

// Mock event incoming from Kafka
setTimeout(() => {
  processNotification({
    eventId: 'evt-12345',
    userId: 101,
    deviceToken: 'fcm-token-xyz',
    title: 'New message from Alice',
    body: 'Hey there!'
  });
}, 2000);

console.log('Notification Service active and polling Kafka...');
