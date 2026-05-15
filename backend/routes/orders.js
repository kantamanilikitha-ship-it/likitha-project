const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/orders - place a new order
router.post('/', (req, res) => {
  try {
    const { session_id, customer_name, customer_email, customer_phone, address } = req.body;

    if (!session_id || !customer_name || !customer_email || !customer_phone || !address) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    // Validate phone
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(customer_phone.replace(/\s/g, ''))) {
      return res.status(400).json({ success: false, error: 'Invalid phone number (10 digits starting with 6-9)' });
    }

    // Get cart items
    const cartItems = db.prepare(`
      SELECT ci.id, ci.product_id, ci.quantity,
             p.name, p.price, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = ?
    `).all(session_id);

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    // Check stock availability
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${item.name}. Available: ${item.stock}`
        });
      }
    }

    // Calculate total
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCharge = subtotal >= 500 ? 0 : 40;
    const total = subtotal + deliveryCharge;

    // Create order in a transaction
    const placeOrder = db.transaction(() => {
      // Insert order
      const orderResult = db.prepare(`
        INSERT INTO orders (customer_name, customer_email, customer_phone, address, total, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(customer_name, customer_email, customer_phone, address, total);

      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Update stock
      const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

      for (const item of cartItems) {
        insertItem.run(orderId, item.product_id, item.name, item.price, item.quantity);
        updateStock.run(item.quantity, item.product_id);
      }

      // Clear cart
      db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(session_id);

      return orderId;
    });

    const orderId = placeOrder();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      orderId: orderId,
      total: total,
      deliveryCharge: deliveryCharge
    });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ success: false, error: 'Failed to place order' });
  }
});

// GET /api/orders/:id - get order details
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ success: true, data: { ...order, items } });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

module.exports = router;
