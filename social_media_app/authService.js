const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretaccess';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'supersecretrefresh';

// Mock DB
const usersDB = {
  'user@example.com': {
    id: 1,
    role: 'user',
    password_hash: bcrypt.hashSync('password123', 10)
  }
};

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = usersDB[email];
  
  if (user && await bcrypt.compare(password, user.password_hash)) {
    // 1. Generate short-lived Access Token (15 mins)
    const accessToken = jwt.sign(
      { id: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '15m' }
    );

    // 2. Generate long-lived Refresh Token (7 days)
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
    
    // Store refresh token hash in mock DB
    user.refresh_token_hash = bcrypt.hashSync(refreshToken, 10);

    res.json({ accessToken, refreshToken });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Auth Service active on port ${PORT}`));
