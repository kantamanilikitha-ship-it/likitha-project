const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Cart is stored in session
router.get('/', (req, res) => {
  const cart = req.session.cart || [];
  let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ success: true, cart, total: total.toFixed(2), count: cart.length });
});

router.post('/add', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(i => i.productId === productId);

  if (existing) {
    existing.quantity += parseInt(quantity);
  } else {
    req.session.cart.push({
      productId,
      name: product.name,
      price: product.price,
      image: product.image,
      unit: product.unit,
      quantity: parseInt(quantity)
    });
  }

  const count = req.session.cart.reduce((sum, i) => sum + i.quantity, 0);
  res.json({ success: true, message: 'Added to cart', count });
});

router.put('/update', (req, res) => {
  const { productId, quantity } = req.body;
  if (!req.session.cart) return res.json({ success: false });

  if (quantity <= 0) {
    req.session.cart = req.session.cart.filter(i => i.productId !== productId);
  } else {
    const item = req.session.cart.find(i => i.productId === productId);
    if (item) item.quantity = parseInt(quantity);
  }

  const cart = req.session.cart;
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  res.json({ success: true, cart, total: total.toFixed(2), count });
});

router.delete('/remove/:productId', (req, res) => {
  if (!req.session.cart) return res.json({ success: true });
  req.session.cart = req.session.cart.filter(i => i.productId !== parseInt(req.params.productId));
  const cart = req.session.cart;
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  res.json({ success: true, cart, total: total.toFixed(2), count });
});

router.delete('/clear', (req, res) => {
  req.session.cart = [];
  res.json({ success: true });
});

module.exports = router;
