const productGrid = document.getElementById('product-grid');
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeModal = document.getElementById('close-modal');
const cartCount = document.getElementById('cart-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const filterBtns = document.querySelectorAll('.filter-item');
const paybillAmount = document.getElementById('paybill-amount');
const confirmOrderBtn = document.getElementById('confirm-order-btn');

const searchInput = document.getElementById('search-input');
const detailsModal = document.getElementById('details-modal');
const closeDetailsModal = document.getElementById('close-details-modal');
const detailsBody = document.getElementById('details-body');

const hamburgerMenu = document.getElementById('hamburger-menu');
const navLinks = document.getElementById('nav-links');

if (hamburgerMenu && navLinks) {
    hamburgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

let products = [];
let cart = [];
let activeCategoryFilter = 'all';
let searchQuery = '';

// Fetch products from backend API
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        products = await res.json();
        renderProducts(products);
    } catch (err) {
        productGrid.innerHTML = '<p>Error loading products.</p>';
        console.error(err);
    }
}

// Render Products
function renderProducts(items) {
    productGrid.innerHTML = '';
    if(items.length === 0) {
        productGrid.innerHTML = '<p>No products found.</p>';
        return;
    }
    items.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const imgSrc = product.image.startsWith('http') || product.image.startsWith('data:') ? product.image : '/' + product.image;
        const stockBadge = product.inStock === false ? '<div class="stock-badge">Out of Stock</div>' : '';
        const btnClass = product.inStock === false ? 'add-to-cart disabled' : 'add-to-cart';
        const btnState = product.inStock === false ? 'disabled' : `onclick="addToCart(${product.id})"`;
        const btnText = product.inStock === false ? 'Unavailable' : 'Add to Cart';

        card.innerHTML = `
            <div style="position:relative; cursor: pointer; width: 100%; padding-top: 100%; overflow: hidden; border-radius: 10px; margin-bottom: 1rem;" onclick="openProductDetails(${product.id})">
                <img src="${imgSrc}" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'500\' height=\'500\'><rect width=\'100%\' height=\'100%\' fill=\'%23f0f0f0\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'sans-serif\' font-size=\'20\' fill=\'%23999\'>No Image</text></svg>';" alt="${product.name}" class="prod-image" style="position: absolute; top:0; left:0; width: 100%; height: 100%; object-fit: cover; border-radius: 10px;">
                ${stockBadge}
            </div>
            <div class="prod-info" style="display: flex; flex-direction: column; flex: 1; text-align: center;">
                <div class="category" style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.3rem;">${product.category}</div>
                <h3 style="cursor: pointer; transition: color 0.3s; font-size: 1.2rem; color: #333; margin-bottom: 0.5rem;" onmouseover="this.style.color='#8F5571'" onmouseout="this.style.color=''" onclick="openProductDetails(${product.id})">${product.name}</h3>
                <p class="description" style="font-size: 0.85rem; color: #666; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer; margin-bottom: 1rem; flex: 1;" onclick="openProductDetails(${product.id})">${product.description || 'No description available.'}</p>
                <div class="price" style="font-weight: 700; color: #8F5571; font-size: 1.2rem; margin-bottom: 1rem;">KSH ${product.price.toLocaleString()}</div>
                <button class="${btnClass}" ${btnState} style="width: 100%;">${btnText}</button>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

// Filter Logic
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeCategoryFilter = e.target.getAttribute('data-filter');
        applyFilters();
    });
});

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        applyFilters();
    });
}

function applyFilters() {
    let filtered = products;
    
    if (activeCategoryFilter !== 'all') {
        filtered = filtered.filter(p => p.category.toLowerCase() === activeCategoryFilter.toLowerCase());
    }
    
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            (p.description && p.description.toLowerCase().includes(searchQuery))
        );
    }
    
    renderProducts(filtered);
}

// Cart Logic
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if(product) {
        cart.push(product);
        updateCart();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function updateCart() {
    cartCount.innerText = cart.length;
    renderCartItems();
}

function renderCartItems() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="item-details">
                <h4>${item.name}</h4>
            </div>
            <div class="item-price">KSH ${item.price.toLocaleString()}</div>
            <button class="remove-item" onclick="removeFromCart(${index})"><i class="fas fa-times"></i></button>
        `;
        cartItemsContainer.appendChild(div);
    });
    
    cartTotalEl.innerText = `KSH ${total.toLocaleString()}`;
    paybillAmount.innerText = `KSH ${total.toLocaleString()}`;
}

// Modal Handlers
cartBtn.addEventListener('click', () => {
    cartModal.classList.add('active');
});

closeModal.addEventListener('click', () => {
    cartModal.classList.remove('active');
});

function openProductDetails(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const imgSrc = product.image.startsWith('http') || product.image.startsWith('data:') ? product.image : '/' + product.image;
    const btnClass = product.inStock === false ? 'add-to-cart disabled' : 'add-to-cart';
    const btnState = product.inStock === false ? 'disabled' : `onclick="addToCart(${product.id}); closeProductDetails();"`;
    const btnText = product.inStock === false ? 'Unavailable' : 'Add to Cart';

    detailsBody.innerHTML = `
        <div style="flex: 1; min-width: 300px; display: flex; align-items: center; justify-content: center; background: #fafafa;">
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'500\' height=\'500\'><rect width=\'100%\' height=\'100%\' fill=\'%23f0f0f0\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'sans-serif\' font-size=\'20\' fill=\'%23999\'>No Image</text></svg>';" alt="${product.name}" style="max-width: 100%; max-height: 500px; object-fit: contain; border-top-left-radius: 10px; border-bottom-left-radius: 10px;">
        </div>
        <div style="flex: 1; padding: 2.5rem; min-width: 300px; display: flex; flex-direction: column; justify-content: center;">
            <div class="category" style="color: #8F5571; font-weight: 600; text-transform: uppercase; font-size: 0.9rem; margin-bottom: 0.5rem; letter-spacing: 1px;">${product.category}</div>
            <h2 style="font-size: 2.2rem; margin-bottom: 0.5rem; color: #222; font-family: 'Outfit';">${product.name}</h2>
            <div class="price" style="font-size: 1.8rem; font-weight: 700; color: #333; margin-bottom: 1.5rem;">KSH ${product.price.toLocaleString()}</div>
            <p style="color: #555; line-height: 1.7; margin-bottom: 2rem; font-size: 1rem;">${product.description || 'No detailed description is available for this product at the moment.'}</p>
            <div style="margin-top: auto;">
                <button class="${btnClass}" ${btnState} style="width: 100%; padding: 1.2rem; font-size: 1.1rem; border-radius: 8px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; transition: transform 0.2s; cursor: pointer;">${btnText}</button>
            </div>
        </div>
    `;
    
    detailsModal.classList.add('active');
}

function closeProductDetails() {
    detailsModal.classList.remove('active');
}

if (closeDetailsModal) {
    closeDetailsModal.addEventListener('click', closeProductDetails);
}

window.addEventListener('click', (e) => {
    if (e.target === cartModal) cartModal.classList.remove('active');
    if (e.target === detailsModal) detailsModal.classList.remove('active');
});

confirmOrderBtn.addEventListener('click', async () => {
    const code = document.getElementById('mpesa-code').value;
    if(!code || code.length < 8) {
        alert('Please enter a valid M-Pesa Code.');
        return;
    }
    if(cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }
    
    confirmOrderBtn.innerText = 'Processing...';
    confirmOrderBtn.disabled = true;
    
    try {
        const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
        
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mpesaCode: code,
                amount: totalAmount,
                items: cart.map(i => ({ id: i.id, name: i.name, price: i.price }))
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Payment confirmed! Order #${result.orderId} is being processed via Sheryl Boutique. Thank you!`);
            cart = [];
            updateCart();
            cartModal.classList.remove('active');
            document.getElementById('mpesa-code').value = '';
        } else {
            alert('Failed to process payment. ' + (result.message || 'Please try again.'));
        }
    } catch (err) {
        console.error('Checkout error:', err);
        alert('An error occurred while confirming your order.');
    } finally {
        confirmOrderBtn.innerText = 'Confirm Order';
        confirmOrderBtn.disabled = false;
    }
});

// Init
loadProducts();
