const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/cart/:sessionId - get cart items with product details
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const items = db.prepare(`
      SELECT ci.id, ci.session_id, ci.product_id, ci.quantity,
             p.name, p.price, p.category, p.stock, p.image_url, p.description
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = ?
      ORDER BY ci.id
    `).all(sessionId);

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ success: true, data: items, total: total, itemCount: itemCount });
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch cart' });
  }
});

// POST /api/cart/:sessionId - add item to cart
router.post('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'product_id is required' });
    }

    // Check product exists and has stock
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check if item already in cart
    const existing = db.prepare(
      'SELECT * FROM cart_items WHERE session_id = ? AND product_id = ?'
    ).get(sessionId, product_id);

    if (existing) {
      const newQty = existing.quantity + parseInt(quantity);
      if (newQty > product.stock) {
        return res.status(400).json({ success: false, error: `Only ${product.stock} items in stock` });
      }
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
      res.json({ success: true, message: 'Cart updated', quantity: newQty });
    } else {
      if (parseInt(quantity) > product.stock) {
        return res.status(400).json({ success: false, error: `Only ${product.stock} items in stock` });
      }
      const result = db.prepare(
        'INSERT INTO cart_items (session_id, product_id, quantity) VALUES (?, ?, ?)'
      ).run(sessionId, product_id, parseInt(quantity));
      res.status(201).json({ success: true, message: 'Item added to cart', id: result.lastInsertRowid });
    }
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ success: false, error: 'Failed to add item to cart' });
  }
});

// PUT /api/cart/:sessionId/:itemId - update quantity
router.put('/:sessionId/:itemId', (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || parseInt(quantity) < 1) {
      return res.status(400).json({ success: false, error: 'Valid quantity is required' });
    }

    const cartItem = db.prepare(
      'SELECT ci.*, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.id = ? AND ci.session_id = ?'
    ).get(itemId, sessionId);

    if (!cartItem) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    if (parseInt(quantity) > cartItem.stock) {
      return res.status(400).json({ success: false, error: `Only ${cartItem.stock} items in stock` });
    }

    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND session_id = ?')
      .run(parseInt(quantity), itemId, sessionId);

    res.json({ success: true, message: 'Quantity updated' });
  } catch (err) {
    console.error('Error updating cart:', err);
    res.status(500).json({ success: false, error: 'Failed to update cart' });
  }
});

// DELETE /api/cart/:sessionId/:itemId - remove item
router.delete('/:sessionId/:itemId', (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const result = db.prepare(
      'DELETE FROM cart_items WHERE id = ? AND session_id = ?'
    ).run(itemId, sessionId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    console.error('Error removing cart item:', err);
    res.status(500).json({ success: false, error: 'Failed to remove item' });
  }
});

// DELETE /api/cart/:sessionId - clear entire cart
router.delete('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(sessionId);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    console.error('Error clearing cart:', err);
    res.status(500).json({ success: false, error: 'Failed to clear cart' });
  }
});

module.exports = router;
