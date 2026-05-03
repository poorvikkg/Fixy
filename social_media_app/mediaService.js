const express = require('express');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });

const app = express();
app.use(express.json());

// 1. Generate Pre-signed URL (Client uploads directly to S3)
app.get('/upload-url', async (req, res) => {
  const { filename, fileType } = req.query;
  const key = `uploads/${Date.now()}_${filename}`;

  const params = {
    Bucket: process.env.AWS_BUCKET || 'social-media-bucket',
    Key: key,
    ContentType: fileType,
    Expires: 300 // URL valid for 5 minutes
  };

  try {
    const uploadUrl = s3.getSignedUrl('putObject', params);
    res.json({ uploadUrl, key });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

// 2. Webhook called by S3 after successful upload
app.post('/webhook/s3-upload-complete', async (req, res) => {
  const { key, size, uploaderId } = req.body;

  // Mock DB update
  console.log(`Saved metadata to DB: ${key}, Size: ${size}`);

  // Push to Kafka for processing
  console.log(`Pushed thumbnail generation job to queue for ${key}`);

  res.status(200).send('Processing initiated');
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Media Service active on port ${PORT}`));
