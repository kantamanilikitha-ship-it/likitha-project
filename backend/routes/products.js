const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/products - get all products with optional filters
router.get('/', (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && ['kirana', 'general', 'stationery'].includes(category)) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY category, name';

    const products = db.prepare(query).all(...params);
    res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /api/products/categories - get all categories with counts
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(
      'SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category'
    ).all();
    const total = db.prepare('SELECT COUNT(*) as count FROM products').get();
    res.json({ success: true, data: categories, total: total.count });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// GET /api/products/:id - get single product
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

module.exports = router;
