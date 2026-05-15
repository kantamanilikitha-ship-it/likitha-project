const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

router.post('/register', (req, res) => {
  const db = req.app.locals.db;
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'All fields required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)').run(name, email, hashed, phone || '');

  req.session.userId = result.lastInsertRowid;
  req.session.userName = name;
  req.session.userRole = 'customer';
  res.json({ success: true, message: 'Registered successfully', user: { id: result.lastInsertRowid, name, email, role: 'customer' } });
});

router.post('/login', (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userRole = user.role;
  res.json({ success: true, message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, user: null });
  const db = req.app.locals.db;
  const user = db.prepare('SELECT id, name, email, phone, address, role FROM users WHERE id = ?').get(req.session.userId);
  res.json({ success: true, user });
});

module.exports = router;
