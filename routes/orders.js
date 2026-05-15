const express = require('express');
const router = express.Router();

router.post('/place', (req, res) => {
  const db = req.app.locals.db;
  const { name, email, phone, address, paymentMethod } = req.body;
  const cart = req.session.cart || [];

  if (!cart.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
  if (!name || !email || !phone || !address) return res.status(400).json({ success: false, message: 'All fields required' });

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const userId = req.session.userId || null;

  const placeOrder = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, address, total, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, name, email, phone, address, total, paymentMethod || 'cod');

    const orderId = result.lastInsertRowid;
    for (const item of cart) {
      db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)').run(
        orderId, item.productId, item.name, item.quantity, item.price
      );
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.productId);
    }
    return orderId;
  });

  const orderId = placeOrder();
  req.session.cart = [];
  res.json({ success: true, message: 'Order placed!', orderId });
});

router.get('/user/mine', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ success: false, message: 'Not logged in' });
  const db = req.app.locals.db;
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.session.userId);
  res.json({ success: true, orders });
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(parseInt(req.params.id));
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(parseInt(req.params.id));
  res.json({ success: true, order, items });
});

module.exports = router;
