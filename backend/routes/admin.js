const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = 'kiranaplus_secret_key_2024';

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, username: admin.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// GET /api/admin/products - get all products
router.get('/products', authenticateToken, (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
    res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// POST /api/admin/products - add product
router.post('/products', authenticateToken, (req, res) => {
  try {
    const { name, description, price, category, stock, image_url } = req.body;

    if (!name || !price || !category || stock === undefined) {
      return res.status(400).json({ success: false, error: 'name, price, category, and stock are required' });
    }

    if (!['kirana', 'general', 'stationery'].includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    if (parseFloat(price) <= 0) {
      return res.status(400).json({ success: false, error: 'Price must be greater than 0' });
    }

    const result = db.prepare(`
      INSERT INTO products (name, description, price, category, stock, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, description || '', parseFloat(price), category, parseInt(stock), image_url || null);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Product added', data: product });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ success: false, error: 'Failed to add product' });
  }
});

// PUT /api/admin/products/:id - update product
router.put('/products/:id', authenticateToken, (req, res) => {
  try {
    const { name, description, price, category, stock, image_url } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (category && !['kirana', 'general', 'stationery'].includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    db.prepare(`
      UPDATE products SET
        name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      price ? parseFloat(price) : existing.price,
      category || existing.category,
      stock !== undefined ? parseInt(stock) : existing.stock,
      image_url !== undefined ? image_url : existing.image_url,
      id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ success: true, message: 'Product updated', data: updated });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id - delete product
router.delete('/products/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// GET /api/admin/orders - get all orders
router.get('/orders', authenticateToken, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    const ordersWithItems = orders.map(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      return { ...order, items };
    });
    res.json({ success: true, data: ordersWithItems, count: orders.length });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// PUT /api/admin/orders/:id/status - update order status
router.put('/orders/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status required' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true, message: 'Order status updated' });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// GET /api/admin/stats - dashboard stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status != 'cancelled'").get();
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get();
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock < 10').get();

    res.json({
      success: true,
      data: {
        totalProducts: totalProducts.count,
        totalOrders: totalOrders.count,
        totalRevenue: totalRevenue.revenue,
        pendingOrders: pendingOrders.count,
        lowStock: lowStock.count
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

module.exports = router;
