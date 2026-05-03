const express = require('express');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();

// 1. Global Rate Limiter (Prevent DDoS)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 1000 requests per minute
  message: 'Too many requests from this IP, please try again later.'
});
app.use(globalLimiter);

// 2. JWT Authentication Middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretaccess', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid Token' });
    req.user = decoded; // Attach user payload
    // Forward user ID to internal microservices via custom header
    req.headers['X-Internal-User-Id'] = decoded.id; 
    next();
  });
};

// 3. Reverse Proxy Routing
app.use('/api/feed', requireAuth, createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));
app.use('/api/media', requireAuth, createProxyMiddleware({ target: 'http://localhost:3002', changeOrigin: true }));

// Auth service bypasses the requireAuth middleware
app.use('/api/auth', createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true }));

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`API Gateway active on port ${PORT}`));
