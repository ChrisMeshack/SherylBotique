require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const compression = require('compression');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

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
    password: { type: String, required: true },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null }
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
        console.error('Login Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
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
        console.error('Signup Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!MONGODB_URI) return res.status(500).json({ success: false, message: 'Database disconnected' });

    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Return success even if user not found for security purposes
            return res.json({ success: true });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetLink = `https://sheryl-botique.vercel.app/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;
        
        await resend.emails.send({
            from: 'Sheryl Boutique Support <onboarding@resend.dev>',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: sans-serif; text-align: center; padding: 2rem;">
                    <h2 style="color: #8F5571;">Sheryl Boutique</h2>
                    <p>You requested a password reset. Click the button below to set a new password:</p>
                    <a href="${resetLink}" style="display: inline-block; background-color: #8F5571; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold;">Reset Password</a>
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">This link will expire in 1 hour.</p>
                </div>
            `
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Forgot Pass Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { email, token, password } = req.body;
    if (!email || !token || !password) return res.status(400).json({ success: false, message: 'Missing tracking link data or new password.' });
    if (!MONGODB_URI) return res.status(500).json({ success: false, message: 'Database disconnected' });

    try {
        const user = await User.findOne({ 
            email, 
            resetToken: token, 
            resetTokenExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token. Please request a new link.' });
        }

        user.password = hashPassword(password);
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();

        res.json({ success: true });
    } catch (err) {
        console.error('Reset Pass Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
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
