const express = require('express');
const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.session.userRole !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

router.get('/stats', adminOnly, (req, res) => {
  const db = req.app.locals.db;
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const rev = db.prepare('SELECT SUM(total) as sum FROM orders').get();
  const totalRevenue = rev.sum || 0;
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "customer"').get().count;
  const pendingOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = "pending"').get().count;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5').all();
  res.json({ success: true, stats: { totalOrders, totalRevenue, totalProducts, totalUsers, pendingOrders }, recentOrders });
});

router.get('/orders', adminOnly, (req, res) => {
  const db = req.app.locals.db;
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  res.json({ success: true, orders });
});

router.put('/orders/:id/status', adminOnly, (req, res) => {
  const db = req.app.locals.db;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, parseInt(req.params.id));
  res.json({ success: true });
});

router.get('/products', adminOnly, (req, res) => {
  const db = req.app.locals.db;
  const products = db.prepare(
    'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC'
  ).all();
  res.json({ success: true, products });
});

router.post('/products', adminOnly, (req, res) => {
  const db = req.app.locals.db;
  const { name, description, price, original_price, stock, category_id, unit, featured } = req.body;
  const result = db.prepare(
    'INSERT INTO products (name, description, price, original_price, stock, category_id, unit, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, description || '', parseFloat(price), original_price ? parseFloat(original_price) : null, parseInt(stock) || 0, parseInt(category_id), unit || 'piece', featured ? 1 : 0);
  res.json({ success: true, message: 'Product added', id: result.lastInsertRowid });
});

router.put('/products/:id', adminOnly, (req, res) => {
  const db = req.app.locals.db;
  const { name, description, price, original_price, stock, category_id, unit, featured } = req.body;
  db.prepare(
    'UPDATE products SET name=?, description=?, price=?, original_price=?, stock=?, category_id=?, unit=?, featured=? WHERE id=?'
  ).run(name, description || '', parseFloat(price), original_price ? parseFloat(original_price) : null, parseInt(stock), parseInt(category_id), unit, featured ? 1 : 0, parseInt(req.params.id));
  res.json({ success: true, message: 'Product updated' });
});

router.delete('/products/:id', adminOnly, (req, res) => {
  const db = req.app.locals.db;
  db.prepare('DELETE FROM products WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true, message: 'Product deleted' });
});

router.get('/users', adminOnly, (req, res) => {
  const db = req.app.locals.db;
  const users = db.prepare('SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC').all();
  res.json({ success: true, users });
});

module.exports = router;
