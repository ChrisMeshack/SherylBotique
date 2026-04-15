# Sheryl Boutique
A full-stack, highly scalable Node.js and Express.js E-Commerce platform for Sheryl Boutique.

## 🚀 Features
- **Portrait Product Catalog:** Clean, responsive grid displaying products.
- **Product Details:** Immediate popup models pulling specific detailed attributes dynamically.
- **Search & Filter:** Category dropdowns and live search functionality to find exact products instantly.
- **Complete M-Pesa Checkout Flow:** Instructions and confirmation codes strictly handled via the checkout logic.
- **Admin Dashboard:** Real-time adding, editing, managing inventory, and deleting of products securely.
- **Security:** Full encryption via native `crypto` libraries. CSRF token mitigation on cookies (Strict / HttpOnly enabled).
- **Graceful Fault Tolerance:** Global routing error-handling ensuring a 99% uptime sequence.

## 📦 Tech Stack
- Frontend: HTML5, CSS3/SCSS, Vanilla Javascript
- Backend: Node.js, Express.js
- Packaging: Multer (Image uploads), Compression, Express-Sessions.

## ⚙️ How to Deploy & Run
1. `npm install` to download dependencies
2. `npm run build:css` to build the required css from the scss source files
3. `npm start` to run the production build
4. Server defaults to `http://localhost:3000`

*Sheryl Boutique is completely production ready with environment `PORT` mapping for platforms like Render, Heroku, or DigitalOcean.*
