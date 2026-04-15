const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const compression = require('compression');
const crypto = require('crypto');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'images');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\\s+/g, '-'));
    }
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session for admin
app.use(session({
    secret: 'sheryl-boutique-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        sameSite: 'strict'
    } 
}));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin Route
app.get('/admin', (req, res) => {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
    }
});

// Auth endpoints
const usersDbPath = path.join(__dirname, 'users.json');

// Helper to get users
function getUsers() {
    try {
        const data = fs.readFileSync(usersDbPath, 'utf8');
        return JSON.parse(data).users || [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(usersDbPath, JSON.stringify({ users }, null, 2));
}

// Helper to hash passwords
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// User & Admin Login Post
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
    }
    
    const hashedPassword = hashPassword(password);
    
    // Check if admin
    if (email === 'admin' && (password === 'admin123' || hashedPassword === hashPassword('admin123'))) {
        req.session.isAdmin = true;
        return res.json({ success: true, redirect: '/admin' });
    }

    // Check normal users
    const users = getUsers();
    const user = users.find(u => u.email === email && (u.password === hashedPassword || u.password === password));

    if (user) {
        req.session.user = email;
        res.json({ success: true, redirect: '/' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// User Signup Post
app.post('/api/auth/signup', (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();
    
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    users.push({ email, password: hashPassword(password) });
    saveUsers(users);
    res.json({ success: true });
});

// Forgot Password Mock
app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    // In a real app we'd send an email. For mockup just return true.
    res.json({ success: true });
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Products API
const dataFile = path.join(__dirname, 'data.json');

// Init default data if empty
function getProducts() {
    try {
        const data = fs.readFileSync(dataFile, 'utf8');
        return JSON.parse(data).products || [];
    } catch (e) {
        const initialData = {
            products: [
                { id: 1, name: "Men's Classic Shirt", description: "A high quality classic shirt for men.", price: 1500, category: "Men", inStock: true, image: "https://images.unsplash.com/photo-1596755094514-f87e32f85e98?auto=format&fit=crop&w=500&q=80" },
                { id: 2, name: "Women's Elegant Skirt", description: "Elegant skirt suitable for professional and formal wear.", price: 2000, category: "Women", inStock: true, image: "https://images.unsplash.com/photo-1583496661160-c58cb2206269?auto=format&fit=crop&w=500&q=80" },
                { id: 3, name: "Kids Casual Outfit", description: "Comfortable and durable outfit for kids.", price: 1200, category: "Kids", inStock: true, image: "https://images.unsplash.com/photo-1519241047957-be31d7379a5d?auto=format&fit=crop&w=500&q=80" },
                { id: 4, name: "Leather Shoes (Men)", description: "Premium genuine leather shoes.", price: 4500, category: "Shoes", inStock: true, image: "https://images.unsplash.com/photo-1614252339460-e1caad5188bf?auto=format&fit=crop&w=500&q=80" },
                { id: 5, name: "Women's Heels", description: "Stylish and comfortable heels for everyday wear.", price: 3500, category: "Shoes", inStock: true, image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=500&q=80" },
                { id: 6, name: "Designer Trousers (Women)", description: "Chic designer trousers with a perfect fit.", price: 2500, category: "Women", inStock: true, image: "https://images.unsplash.com/photo-1509631179647-0c114314777c?auto=format&fit=crop&w=500&q=80" },
                { id: 7, name: "Kids Denim Jacket", description: "Warm and cool denim jacket for kids.", price: 1800, category: "Kids", inStock: true, image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=500&q=80" },
                { id: 8, name: "Men's Leather Jacket", description: "A tough, classic leather jacket.", price: 6500, category: "Men", inStock: false, image: "https://images.unsplash.com/photo-1521223830155-f2cb1aa281e4?auto=format&fit=crop&w=500&q=80" },
                { id: 9, name: "Women's Handbag", description: "Spacious and elegant designer handbag.", price: 2200, category: "Women", inStock: true, image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=500&q=80" },
                { id: 10, name: "Formal Men's Shoes", description: "Sharp, formal shoes for office or special events.", price: 4000, category: "Shoes", inStock: true, image: "https://images.unsplash.com/photo-1588602635925-50a8d46fb59b?auto=format&fit=crop&w=500&q=80" }
            ]
        };
        fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
        return initialData.products;
    }
}

function saveProducts(products) {
    fs.writeFileSync(dataFile, JSON.stringify({ products }, null, 2));
}

// GET all products
app.get('/api/products', (req, res) => {
    res.json(getProducts());
});

// Admin ONLY middleware for CRUD
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) return next();
    res.status(403).json({ error: 'Unauthorized' });
}

// POST create product
app.post('/api/products', requireAdmin, upload.single('image'), (req, res) => {
    const products = getProducts();
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    const newProduct = {
        id: newId,
        name: req.body.name,
        description: req.body.description || '',
        category: req.body.category,
        price: Number(req.body.price),
        inStock: req.body.inStock === 'true',
        image: req.file ? `images/${req.file.filename}` : "https://via.placeholder.com/500" // Fallback
    };
    
    products.push(newProduct);
    saveProducts(products);
    res.json({ success: true, product: newProduct });
});

// PUT update product
app.put('/api/products/:id', requireAdmin, upload.single('image'), (req, res) => {
    const products = getProducts();
    const idx = products.findIndex(p => p.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    
    const currentProduct = products[idx];
    products[idx] = {
        ...currentProduct,
        name: req.body.name || currentProduct.name,
        description: req.body.description !== undefined ? req.body.description : currentProduct.description,
        category: req.body.category || currentProduct.category,
        price: req.body.price ? Number(req.body.price) : currentProduct.price,
        inStock: req.body.inStock !== undefined ? req.body.inStock === 'true' : currentProduct.inStock,
        image: req.file ? `images/${req.file.filename}` : currentProduct.image
    };
    
    saveProducts(products);
    res.json({ success: true, product: products[idx] });
});

// DELETE product
app.delete('/api/products/:id', requireAdmin, (req, res) => {
    let products = getProducts();
    products = products.filter(p => p.id !== Number(req.params.id));
    saveProducts(products);
    res.json({ success: true });
});

// Orders API (FR-13: Store submitted transaction details)
const ordersFile = path.join(__dirname, 'orders.json');

function getOrders() {
    try {
        const data = fs.readFileSync(ordersFile, 'utf8');
        return JSON.parse(data).orders || [];
    } catch (e) {
        return [];
    }
}

function saveOrders(orders) {
    fs.writeFileSync(ordersFile, JSON.stringify({ orders }, null, 2));
}

app.post('/api/orders', (req, res) => {
    const { mpesaCode, amount, items } = req.body;
    
    if (!mpesaCode) {
        return res.status(400).json({ success: false, message: 'M-Pesa code is required' });
    }
    
    const orders = getOrders();
    const newOrder = {
        id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1,
        mpesaCode,
        amount,
        items,
        date: new Date().toISOString(),
        status: 'Pending'
    };
    
    orders.push(newOrder);
    saveOrders(orders);
    
    res.json({ success: true, orderId: newOrder.id });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Something went wrong, but the server is still running.'
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
