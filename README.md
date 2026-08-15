# Chamundeshwari Home Sweets & Hots

A full MERN e-commerce site with a separate customer website and owner admin panel.

- **Customer site**: browse 21 products, order by grams (50g steps), cart, COD or UPI (dynamic QR), printable invoice, order tracking, feedback.
- **Admin panel**: add/edit/delete products with images, manage stock & price per kg, offers, order status pipeline (New → Accepted → Packed → Dispatched → Delivered), payment status, feedback, and a dashboard with today's/monthly collection, low stock alerts, best sellers, and a 7-day revenue graph.

Classic CSS throughout (no Tailwind) — brass, maroon and cream color theme.

---

## 1. Requirements

- Node.js 18+
- MongoDB (local install, or a free MongoDB Atlas cluster)

## 2. Setup

```bash
# from the project root
npm run install:all
```

This installs dependencies in both `server/` and `client/`.

### Configure the server

```bash
cd server
cp .env.example .env
```

Open `.env` and set:
- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — any long random string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your owner login (created automatically the first time the server starts)
- `UPI_ID` / `UPI_PAYEE_NAME` — already set to your Navi UPI details, change if needed

### Seed starter products (optional but recommended)

```bash
cd server
npm run seed
```

This adds 21 starter sweets & hots products so the site isn't empty. Edit their names, prices, stock and images anytime from the Admin panel — nothing is hardcoded on the frontend.

## 3. Run the app

Open two terminals:

```bash
# Terminal 1 - backend (http://localhost:5000)
npm run server

# Terminal 2 - frontend (http://localhost:5173)
npm run client
```

Visit:
- Customer site: **http://localhost:5173**
- Admin panel: **http://localhost:5173/admin/login** (use the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`)

## 4. How things work

**Gram-based pricing** — every product stores a single `pricePerKg`. All gram prices (50g, 100g, 1kg...) are calculated automatically: `price = pricePerKg × (grams / 1000)`. Stock is also tracked in grams, so partial-kg sales reduce it precisely.

**UPI payment** — there's no payment gateway account involved. At checkout, choosing UPI generates a QR code encoding a `upi://pay` link with your UPI ID, name, and the exact order amount. Any UPI app (Google Pay, PhonePe, Paytm, Navi, BHIM) fills in the amount automatically when scanned. After paying, the customer taps "I've Paid" to mark the order for the owner to verify. This keeps things simple and free, but payment is confirmed manually rather than auto-verified — if you want automatic verification later, that needs a gateway like Razorpay or Cashfree.

**New products appear instantly** — the customer site always fetches the live product list from the database, so anything added or edited in the admin panel shows up immediately on refresh.

**Order tracking** — customers look up their orders by the phone number they used at checkout (no separate customer login system, keeping it simple for a small shop).

## 5. Deploying later

- `client/` → Vercel or Netlify (set `VITE`-style env if you move the API off localhost, and update the `/api` proxy or use an absolute API URL)
- `server/` → Render or Railway, with `MONGO_URI` pointed at MongoDB Atlas
- Product images are stored on the server's local disk (`server/uploads`). On Render/Railway's free tier this storage is **not persistent** across deploys — for production, switch `middleware/upload.js` to upload to Cloudinary or S3 instead. Ask if you want this swapped in.

## 6. What's included vs. what to add next

Included: product catalog, categories, search, related products, cart, gram pricing, COD + UPI checkout, printable invoice, order tracking, feedback & ratings, full admin CRUD, order pipeline, dashboard analytics, low stock alerts.

Not yet wired up (straightforward to add later): customer login/registration + saved order history behind an account, wishlist, wallet-style coupon management UI (currently one hardcoded `SWEET10` code), and PDF invoice download (the print button uses the browser's print-to-PDF, which covers most shops' needs).
