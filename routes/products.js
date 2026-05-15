const express = require('express');
const router = express.Router();

router.get('/meta/categories', (req, res) => {
  const db = req.app.locals.db;
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json({ success: true, categories });
});

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { category, search, featured, sort } = req.query;

  let query = `SELECT p.*, c.name as category_name, c.icon as category_icon
    FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
  const params = [];

  if (category && category !== 'all') { query += ' AND p.category_id = ?'; params.push(parseInt(category)); }
  if (search) { query += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (featured === 'true') { query += ' AND p.featured = 1'; }

  if (sort === 'price_asc') query += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') query += ' ORDER BY p.price DESC';
  else if (sort === 'name') query += ' ORDER BY p.name ASC';
  else query += ' ORDER BY p.featured DESC, p.id ASC';

  const products = db.prepare(query).all(...params);
  res.json({ success: true, products });
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const product = db.prepare(
    'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?'
  ).get(parseInt(req.params.id));
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product });
});

module.exports = router;
