const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'likitha-store-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Start DB first, then routes
initDb().then(db => {
  // Make db available to routes
  app.locals.db = db;

  app.use('/api/products', require('./routes/products'));
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/admin', require('./routes/admin'));

  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));
  app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkout.html')));
  app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
  app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
  app.get('/orders', (req, res) => res.sendFile(path.join(__dirname, 'public', 'orders.html')));

  app.listen(PORT, () => {
    console.log(`\n🛒 Likitha Store is running!`);
    console.log(`👉 Open: http://localhost:${PORT}`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
    console.log(`   Admin login: admin@likitha.com / admin123\n`);
  });
}).catch(err => {
  console.error('Failed to start:', err);
});
