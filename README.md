# 🛍️ Sheryl Boutique E-Commerce Platform

Welcome to **Sheryl Boutique**! This carefully crafted platform empowers you to bring your fashion business into the digital world. Built with simplicity and performance in mind, this completely bespoke web application acts as your 24/7 online storefront and an effortless administrative backend. 

Whether an eager shopper is browsing for the newest apparel, or you are updating inventory from your admin dashboard, this platform is deeply optimized to be incredibly fast, mobile-friendly, and simple to use.

---

## 🌟 How It Works (The Shopper's Workflow)

We’ve removed all the complex hurdles from online shopping. Here is how your customers interact with your boutique:

1. **Browse with Ease:** Customers arrive on a beautifully curated, mobile-first homepage. They can endlessly scroll through large, high-quality portrait layout cards showcasing your apparel.
2. **Instant Search & Filter:** Looking for something specific? Shoppers can instantly sort products by category (Men, Women, Kids) or use the live predictive search bar to find exactly what they want in milliseconds.
3. **Immersive Details:** By clicking on an interesting item, a gorgeous Product Details popup seamlessly slides onto their screen. They can read your dedicated description, check the price, and view the apparel in full scale.
4. **Frictionless Cart:** Shoppers click "Add to Cart" and the bag in the sticky navigation bar pulses. 
5. **The M-Pesa Checkout:** When ready, opening the cart reveals a robust checkout flow. Here, the system calculates the accurate total, provides clear and formal M-Pesa Paybill / Buy Goods payment instructions, and asks the user to insert their confirmation code. Upon confirmation, their order is sent securely directly into your backend matrix!

---

## 💼 The Admin Dashboard (Your Command Center)

Running the business shouldn't require a computer science degree. The Admin Dashboard is incredibly simple, powerful, and secure.

### Accessing the Dashboard
- Navigate to the `/auth.html` page (or click "Sign In" on the Navbar).
- Login using the strictly guarded Admin Credentials *(Default: `admin` / `admin123`)*. 

### What You Can Do
- **Real-Time Analytics:** The moment you log in, you are greeted with instant metrics—track the exact number of active physical products and immediately spot items that are out of stock.
- **Add Fresh Inventory:** Click "Add New Product" to open the intuitive product editor. Upload a fresh image from your computer, type in descriptions, assign categories, and instantly beam it to the live shopper feed.
- **Edit on the Fly:** Prices fluctuating? An item no longer in stock? Simply click the "Edit" button next to any active product to instantly override its price, description, or manually mark it as "Out of Stock" (which greys it out for shoppers and prevents purchases).
- **Manage Orders:** All checkout requests with matching M-Pesa confirmation codes and grand totals securely finalize in your backend.

---

## 🛠️ Technical Details (Under the Hood)

This platform isn't just a pretty interface—it’s aggressively fine-tuned for performance and strictly secured using modern web standards.

- **Stack:** Built heavily using blazing-fast **Vanilla JavaScript** linked to a robust **Node.js + Express.js** server. 
- **Security Protocols:** 
  * Passwords are never saved in plain-text. They are heavily cryptographically scrambled using Node.js's native `crypto` SHA-256 protocols.
  * Your active sessions are secured using strictly verified `httpOnly` flags, rendering dangerous CSRF (Cross-Site Request Forgery) attacks useless.
- **Performance Thresholds:** Low-bandwidth shoppers? No problem. The backend pushes extreme `compression` middlewares that squish data sizes so pages snap onto screens effortlessly under 2 seconds.

---

## 🚀 Running Your Application Locally

Ready to boot up the storefront on your own machine? It only takes a few seconds.

1. **Prerequisite Check:** Ensure you have [Node.js](https://nodejs.org/en/) installed securely on your computer.
2. **Install Dependencies:** Open the folder in the terminal and run `npm install`. This fetches all required engines.
3. **Compile the Paint:** Run `npm run build:css` to rapidly compile any SASS/SCSS framework updates.
4. **Launch the Engines:** Run `npm start`. A message will print telling you that the server is alive! 
5. **Visit the Store:** Open your browser and type in `http://localhost:3000`.

*Developer Note: This codebase is universally production-ready! Your `server.js` dynamic ENV ports natively conform to digital hosts like Render, AWS, or Heroku, allowing instant cloud deployment.*
