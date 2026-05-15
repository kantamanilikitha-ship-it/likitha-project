# 🛒 Likitha Store - E-Commerce Website

A complete e-commerce website for Kirana, Grocery & Stationery items.

## 🚀 How to Run

### Step 1: Install Node.js
Download from: https://nodejs.org/en/download
Choose the **LTS** version. Install it normally.

### Step 2: Start the Store
Double-click **START_STORE.bat** — it does everything automatically!

Or manually:
```
npm install
node server.js
```

### Step 3: Open in Browser
- **Store:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin

---

## 🔑 Login Credentials

| Role  | Email                  | Password  |
|-------|------------------------|-----------|
| Admin | admin@likitha.com      | admin123  |

---

## 📦 Features

### Customer Features
- Browse 35+ products across 5 categories
- Search products by name
- Filter by category
- Sort by price / name
- Add to cart, update quantities
- Checkout with delivery details
- Cash on Delivery & UPI payment options
- Order tracking
- User registration & login

### Admin Features
- Dashboard with stats (orders, revenue, products, users)
- Manage all orders & update status
- Add / Edit / Delete products
- View all customers

### Product Categories
1. 🛒 **Kirana & Grocery** - Rice, Dal, Oil, Spices, Sugar, Salt...
2. 🍪 **Snacks & Beverages** - Biscuits, Chips, Noodles, Tea, Coffee...
3. 🧴 **Personal Care** - Soap, Toothpaste, Shampoo, Handwash...
4. ✏️ **Stationery** - Notebooks, Pens, Pencils, Geometry Box, Books...
5. 🏠 **Household** - Dishwash, Toilet Cleaner, Floor Cleaner...

---

## 🛠️ Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Database:** SQLite (via better-sqlite3)
- **Auth:** bcryptjs + express-session

## 📁 Project Structure
```
likitha/
├── server.js          # Main server
├── database/
│   └── db.js          # Database setup & seed data
├── routes/
│   ├── products.js    # Product APIs
│   ├── cart.js        # Cart APIs
│   ├── orders.js      # Order APIs
│   ├── auth.js        # Login/Register APIs
│   └── admin.js       # Admin APIs
├── public/
│   ├── index.html     # Home page
│   ├── cart.html      # Cart page
│   ├── checkout.html  # Checkout page
│   ├── login.html     # Login page
│   ├── register.html  # Register page
│   ├── orders.html    # My Orders page
│   ├── admin.html     # Admin panel
│   └── style.css      # All styles
├── START_STORE.bat    # Easy launcher
└── package.json
```
