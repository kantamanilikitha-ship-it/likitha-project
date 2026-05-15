const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const initSqlJs = require('sql.js');
const DB_PATH = path.join(__dirname, 'store.db');

let _sqlDb;

function saveDb() {
  const data = _sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Run a query and return first row as plain object
function queryGet(sql, params) {
  params = params || [];
  const results = _sqlDb.exec(sql, params);
  if (!results.length || !results[0].values.length) return undefined;
  const cols = results[0].columns;
  const vals = results[0].values[0];
  const obj = {};
  cols.forEach((c, i) => obj[c] = vals[i]);
  return obj;
}

// Run a query and return all rows as array of plain objects
function queryAll(sql, params) {
  params = params || [];
  const results = _sqlDb.exec(sql, params);
  if (!results.length) return [];
  const cols = results[0].columns;
  return results[0].values.map(vals => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = vals[i]);
    return obj;
  });
}

// Run INSERT/UPDATE/DELETE
function queryRun(sql, params) {
  params = params || [];
  _sqlDb.run(sql, params);
  const lastId = _sqlDb.exec('SELECT last_insert_rowid() as id');
  saveDb();
  return { lastInsertRowid: lastId.length ? lastId[0].values[0][0] : null };
}

const wrapper = {
  prepare(sql) {
    return {
      get(...args)  { return queryGet(sql, args.length === 1 && Array.isArray(args[0]) ? args[0] : args); },
      all(...args)  { return queryAll(sql, args.length === 1 && Array.isArray(args[0]) ? args[0] : args); },
      run(...args)  { return queryRun(sql, args.length === 1 && Array.isArray(args[0]) ? args[0] : args); }
    };
  },
  exec(sql) { _sqlDb.run(sql); saveDb(); },
  pragma() {},
  transaction(fn) {
    return function(...args) {
      _sqlDb.run('BEGIN');
      try {
        const result = fn(...args);
        _sqlDb.run('COMMIT');
        saveDb();
        return result;
      } catch(e) {
        _sqlDb.run('ROLLBACK');
        throw e;
      }
    };
  }
};

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    _sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _sqlDb = new SQL.Database();
  }

  // Create tables
  _sqlDb.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    phone TEXT, address TEXT, role TEXT DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  _sqlDb.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, icon TEXT, description TEXT
  )`);

  _sqlDb.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, description TEXT, price REAL NOT NULL,
    original_price REAL, stock INTEGER DEFAULT 0, category_id INTEGER,
    image TEXT DEFAULT 'default.png', unit TEXT DEFAULT 'piece',
    featured INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  _sqlDb.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL, address TEXT NOT NULL, total REAL NOT NULL,
    status TEXT DEFAULT 'pending', payment_method TEXT DEFAULT 'cod',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  _sqlDb.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL
  )`);

  // Seed if empty
  const catCount = _sqlDb.exec("SELECT COUNT(*) as c FROM categories");
  const count = catCount.length ? catCount[0].values[0][0] : 0;

  if (count === 0) {
    const cats = [
      ['Kirana & Grocery','🛒','Daily essentials'],
      ['Snacks & Beverages','🍪','Biscuits, chips, drinks'],
      ['Personal Care','🧴','Soaps, shampoos'],
      ['Stationery','✏️','Pens, pencils, books'],
      ['Household','🏠','Cleaning supplies']
    ];
    cats.forEach(c => _sqlDb.run("INSERT INTO categories (name,icon,description) VALUES (?,?,?)", c));

    const prods = [
      // Kirana (cat 1)
      ['Basmati Rice (1kg)','Premium long grain basmati rice',85,95,100,1,'kg',1],
      ['Toor Dal (500g)','Fresh toor dal, protein rich',65,75,80,1,'500g',1],
      ['Sunflower Oil (1L)','Refined sunflower cooking oil',130,145,60,1,'litre',1],
      ['Wheat Flour (2kg)','Chakki fresh atta',95,110,50,1,'2kg',0],
      ['Sugar (1kg)','Pure white sugar',45,50,120,1,'kg',0],
      ['Salt (1kg)','Iodized table salt',20,25,150,1,'kg',0],
      ['Turmeric Powder (100g)','Pure haldi powder',35,40,90,1,'100g',0],
      ['Red Chilli Powder (100g)','Spicy red chilli powder',40,48,85,1,'100g',0],
      ['Mustard Seeds (100g)','Black mustard seeds',25,30,100,1,'100g',0],
      ['Chana Dal (500g)','Split chickpeas',60,70,75,1,'500g',0],
      // Snacks (cat 2)
      ['Parle-G Biscuits','Classic glucose biscuits pack',10,12,200,2,'pack',1],
      ['Lays Chips (26g)','Classic salted potato chips',20,20,150,2,'pack',0],
      ['Maggi Noodles (70g)','2-minute instant noodles',14,15,180,2,'pack',1],
      ['Tata Tea (250g)','Premium blend tea',95,110,70,2,'250g',0],
      ['Nescafe Coffee (50g)','Classic instant coffee',120,135,55,2,'50g',0],
      ['Frooti Mango Drink (200ml)','Fresh mango fruit drink',15,15,200,2,'200ml',0],
      ['Kurkure Masala (40g)','Crunchy corn puffs',20,20,160,2,'pack',0],
      // Personal Care (cat 3)
      ['Lux Soap (100g)','Soft skin beauty soap',35,40,100,3,'piece',1],
      ['Colgate Toothpaste (100g)','Strong teeth toothpaste',55,65,90,3,'100g',0],
      ['Head Shoulders Shampoo (180ml)','Anti-dandruff shampoo',175,199,45,3,'180ml',0],
      ['Dettol Handwash (200ml)','Antibacterial liquid handwash',85,99,80,3,'200ml',1],
      ['Vaseline Lotion (100ml)','Moisturizing body lotion',95,110,60,3,'100ml',0],
      // Stationery (cat 4)
      ['Classmate Notebook (200 pages)','Single line ruled notebook',55,65,120,4,'piece',1],
      ['Reynolds Pen (Pack of 5)','Smooth writing ball pen',40,50,150,4,'pack',1],
      ['Natraj Pencil (Pack of 10)','HB pencils for writing',30,35,180,4,'pack',1],
      ['Apsara Eraser','Dust-free eraser',10,12,200,4,'piece',0],
      ['Geometry Box','Complete geometry set with compass',85,100,60,4,'piece',0],
      ['Stapler Mini','Compact stapler with staples',65,80,45,4,'piece',0],
      ['Sticky Notes (100 sheets)','Colorful self-adhesive notes',45,55,90,4,'pack',0],
      ['Scissors Medium','Sharp stainless steel scissors',55,70,70,4,'piece',0],
      ['Drawing Book A4','Thick pages drawing book',40,50,80,4,'piece',0],
      // Household (cat 5)
      ['Vim Dishwash Bar','Grease-cutting dish cleaner',25,30,120,5,'piece',0],
      ['Harpic Toilet Cleaner (500ml)','Powerful toilet cleaner',95,110,65,5,'500ml',1],
      ['Scotch-Brite Scrub Pad','Heavy duty scrubbing pad',30,35,100,5,'piece',0],
      ['Phenyl Floor Cleaner (1L)','Disinfectant floor cleaner',75,90,55,5,'litre',0],
    ];

    prods.forEach(p => _sqlDb.run(
      "INSERT INTO products (name,description,price,original_price,stock,category_id,unit,featured) VALUES (?,?,?,?,?,?,?,?)", p
    ));

    const hashed = bcrypt.hashSync('admin123', 10);
    _sqlDb.run("INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)", ['Admin','admin@likitha.com',hashed,'admin']);

    saveDb();
    console.log('✅ Database seeded with products');
  }

  return wrapper;
}

module.exports = { initDb };
