const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'store.db'));

function initializeDatabase() {
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('kirana', 'general', 'stationery')),
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      address TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `);

  // Seed admin user if not exists
  const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('Admin user created: admin / admin123');
  }

  // Seed products if not exists
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productCount.count === 0) {
    const insertProduct = db.prepare(
      'INSERT INTO products (name, description, price, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const products = [
      // Kirana Items
      ['Rice (5kg)', 'Premium quality long grain white rice, ideal for daily cooking', 280, 'kirana', 50, null],
      ['Wheat Flour (1kg)', 'Finely milled whole wheat flour (atta) for soft rotis', 45, 'kirana', 80, null],
      ['Sugar (1kg)', 'Pure refined white sugar, free flowing', 42, 'kirana', 100, null],
      ['Salt (1kg)', 'Iodized table salt for healthy cooking', 20, 'kirana', 120, null],
      ['Cooking Oil (1L)', 'Refined sunflower oil, light and healthy', 130, 'kirana', 60, null],
      ['Turmeric Powder (100g)', 'Pure haldi powder with rich color and aroma', 35, 'kirana', 90, null],
      ['Red Chilli Powder (100g)', 'Spicy red chilli powder for authentic Indian cooking', 40, 'kirana', 85, null],
      ['Coriander Powder (100g)', 'Freshly ground dhania powder with mild flavor', 30, 'kirana', 75, null],
      ['Mustard Seeds (100g)', 'Black mustard seeds for tempering and pickling', 25, 'kirana', 70, null],
      ['Cumin Seeds (100g)', 'Aromatic jeera seeds for flavoring dishes', 55, 'kirana', 65, null],
      ['Tea Leaves (250g)', 'Premium CTC tea leaves for strong, flavorful chai', 85, 'kirana', 55, null],
      ['Coffee Powder (100g)', 'Rich and aromatic filter coffee powder blend', 95, 'kirana', 40, null],
      ['Toor Dal (500g)', 'Split pigeon peas, protein-rich and easy to cook', 65, 'kirana', 70, null],
      ['Chickpeas (500g)', 'Dried white chickpeas (kabuli chana) for curries', 70, 'kirana', 60, null],
      ['Basmati Rice (1kg)', 'Long grain aged basmati rice with natural fragrance', 120, 'kirana', 45, null],

      // General Items
      ['Bathing Soap', 'Moisturizing bathing soap with natural ingredients, pack of 3', 75, 'general', 100, null],
      ['Shampoo (200ml)', 'Anti-dandruff shampoo for healthy and shiny hair', 120, 'general', 60, null],
      ['Toothpaste (150g)', 'Fluoride toothpaste for cavity protection and fresh breath', 65, 'general', 80, null],
      ['Toothbrush', 'Soft bristle toothbrush for gentle cleaning, pack of 2', 45, 'general', 90, null],
      ['Detergent Powder (1kg)', 'Powerful washing powder for clean and fresh clothes', 95, 'general', 70, null],
      ['Dish Wash Liquid (500ml)', 'Grease-cutting dish wash liquid with lemon fragrance', 80, 'general', 65, null],
      ['Mosquito Coil (10 pcs)', 'All-night mosquito repellent coils, pack of 10', 35, 'general', 110, null],
      ['Candles (12 pcs)', 'White wax candles for power cuts and decoration', 40, 'general', 95, null],
      ['Matchbox (pack of 10)', 'Safety matchboxes, pack of 10', 25, 'general', 150, null],
      ['Batteries AA (4 pcs)', 'Long-lasting alkaline AA batteries, pack of 4', 85, 'general', 55, null],
      ['Tissue Paper (100 sheets)', 'Soft 2-ply tissue paper for everyday use', 55, 'general', 75, null],
      ['Plastic Bags (50 pcs)', 'Reusable carry bags, medium size, pack of 50', 30, 'general', 120, null],

      // Stationery Items
      ['Notebook 200 Pages', 'Single line ruled notebook, A4 size, 200 pages', 65, 'stationery', 80, null],
      ['Notebook 100 Pages', 'Single line ruled notebook, A5 size, 100 pages', 35, 'stationery', 100, null],
      ['Ballpoint Pen Blue (10 pcs)', 'Smooth writing blue ballpoint pens, pack of 10', 50, 'stationery', 120, null],
      ['Ballpoint Pen Black (10 pcs)', 'Smooth writing black ballpoint pens, pack of 10', 50, 'stationery', 110, null],
      ['Pencil HB (10 pcs)', 'Standard HB graphite pencils for writing and drawing', 40, 'stationery', 130, null],
      ['Pencil 2B (10 pcs)', 'Soft 2B graphite pencils for sketching and shading', 45, 'stationery', 90, null],
      ['Eraser (4 pcs)', 'White vinyl erasers, clean erasing without smudging', 20, 'stationery', 150, null],
      ['Sharpener', 'Dual hole metal sharpener for pencils and crayons', 15, 'stationery', 140, null],
      ['Ruler 30cm', 'Transparent plastic ruler with cm and inch markings', 25, 'stationery', 100, null],
      ['Geometry Box', 'Complete geometry set with compass, protractor, set squares', 85, 'stationery', 60, null],
      ['Sketch Pens 12 Colors', 'Bright washable sketch pens, set of 12 colors', 75, 'stationery', 70, null],
      ['Highlighter (5 colors)', 'Fluorescent highlighter markers, set of 5 colors', 60, 'stationery', 80, null],
      ['Stapler', 'Desktop stapler with 1000 staple pins included', 95, 'stationery', 45, null],
      ['Staple Pins (1000 pcs)', 'Standard 26/6 staple pins, box of 1000', 30, 'stationery', 90, null],
      ['Sticky Notes (5 pads)', 'Colorful self-adhesive sticky notes, 5 pads of 100 sheets', 70, 'stationery', 65, null],
    ];

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertProduct.run(...item);
      }
    });
    insertMany(products);
    console.log(`Seeded ${products.length} products`);
  }
}

initializeDatabase();

module.exports = db;
