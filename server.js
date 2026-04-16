require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const compression = require('compression');
const crypto = require('crypto');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(async () => {
            console.log('Connected to MongoDB via Mongoose');
            // Auto-migration from data.json for products
            try {
                const count = await Product.countDocuments();
                if (count === 0) {
                    console.log('Migrating existing products from data.json to MongoDB...');
                    const dataFile = path.join(__dirname, 'data.json');
                    if (fs.existsSync(dataFile)) {
                        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
                        if (data.products && data.products.length > 0) {
                            await Product.insertMany(data.products);
                            console.log(`Successfully migrated ${data.products.length} products to MongoDB!`);
                        }
                    }
                }
            } catch (e) {
                console.error('Migration failed:', e);
            }
        })
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn('WARNING: MONGODB_URI is not defined in environment variables. Database operations will not work properly!');
}

// Schemas
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    inStock: { type: Boolean, default: true },
    image: { type: String, required: true }
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    mpesaCode: { type: String, required: true },
    amount: { type: Number, required: true },
    items: { type: Array, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' }
});
const Order = mongoose.model('Order', orderSchema);

// Configure multer for memory storage (Serverless compatible)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy', 1);

// Cookie-based Session
app.use(cookieSession({
    name: 'sheryl-session',
    secret: process.env.SESSION_SECRET || 'sheryl-boutique-secret',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
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

// Helper to hash passwords
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// User & Admin Login Post
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });
    
    const hashedPassword = hashPassword(password);
    
    if (email === 'admin' && (password === 'admin123' || hashedPassword === hashPassword('admin123'))) {
        req.session.isAdmin = true;
        return res.json({ success: true, redirect: '/admin' });
    }

    if (!MONGODB_URI) return res.status(500).json({ success: false, message: 'Database disconnected' });

    try {
        const user = await User.findOne({ email });
        if (user && (user.password === hashedPassword || user.password === password)) {
            req.session.user = email;
            res.json({ success: true, redirect: '/' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// User Signup Post
app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    
    if (!MONGODB_URI) return res.status(500).json({ success: false, message: 'Database disconnected' });

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });
        
        await User.create({ email, password: hashPassword(password) });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/forgot-password', (req, res) => {
    res.json({ success: true });
});

app.post('/api/admin/logout', (req, res) => {
    req.session = null;
    res.json({ success: true });
});

// Products API
app.get('/api/products', async (req, res) => {
    // If no DB URI, attempt to read old data.json gracefully to prevent UI crash locally
    if (!MONGODB_URI) {
        try {
            const dataFile = path.join(__dirname, 'data.json');
            const data = fs.readFileSync(dataFile, 'utf8');
            return res.json(JSON.parse(data).products || []);
        } catch (e) {
            return res.json([]);
        }
    }

    try {
        const products = await Product.find({}).sort({ id: 1 });
        res.json(products);
    } catch (err) {
        console.error('Failed to fetch products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Admin ONLY middleware for CRUD
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) return next();
    res.status(403).json({ error: 'Unauthorized' });
}

app.post('/api/products', requireAdmin, upload.single('image'), async (req, res) => {
    if (!MONGODB_URI) return res.status(500).json({ error: 'Database disconnected' });

    try {
        const latestProduct = await Product.findOne().sort({ id: -1 });
        const newId = latestProduct ? latestProduct.id + 1 : 1;
        
        let imageStr = "https://via.placeholder.com/500";
        if (req.file) {
            imageStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        const newProduct = await Product.create({
            id: newId,
            name: req.body.name,
            description: req.body.description || '',
            category: req.body.category,
            price: Number(req.body.price),
            inStock: req.body.inStock === 'true',
            image: imageStr
        });
        res.json({ success: true, product: newProduct });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ error: 'Server error adding product' });
    }
});

app.put('/api/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
    if (!MONGODB_URI) return res.status(500).json({ error: 'Database disconnected' });

    try {
        const product = await Product.findOne({ id: Number(req.params.id) });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        let imageStr = product.image;
        if (req.file) {
            imageStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        product.name = req.body.name || product.name;
        product.description = req.body.description !== undefined ? req.body.description : product.description;
        product.category = req.body.category || product.category;
        product.price = req.body.price ? Number(req.body.price) : product.price;
        product.inStock = req.body.inStock !== undefined ? req.body.inStock === 'true' : product.inStock;
        product.image = imageStr;
        
        await product.save();
        res.json({ success: true, product });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Server error updating product' });
    }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    if (!MONGODB_URI) return res.status(500).json({ error: 'Database disconnected' });

    try {
        await Product.deleteOne({ id: Number(req.params.id) });
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Server error deleting product' });
    }
});

// Orders API
app.post('/api/orders', async (req, res) => {
    const { mpesaCode, amount, items } = req.body;
    if (!mpesaCode) return res.status(400).json({ success: false, message: 'M-Pesa code is required' });
    if (!MONGODB_URI) return res.status(500).json({ success: false, message: 'Database disconnected' });
    
    try {
        const latestOrder = await Order.findOne().sort({ id: -1 });
        const newId = latestOrder ? latestOrder.id + 1 : 1;
        
        await Order.create({
            id: newId,
            mpesaCode,
            amount,
            items,
            status: 'Pending'
        });
        res.json({ success: true, orderId: newId });
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ success: false, message: 'Server error creating order' });
    }
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

module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
