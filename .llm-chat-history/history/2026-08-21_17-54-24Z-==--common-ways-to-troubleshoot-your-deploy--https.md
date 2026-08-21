---
title: "==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys"
created: 2026-08-21T17:54:24.149Z
updated: 2026-08-21T17:55:10.098Z
source: "Blackbox AI"
model: "minimax-m2-moonshotai/kimi-k2.6"
---

# ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys

**Created**: 8/21/2026, 11:24:24 PM
**Messages**: 1 (User: 1, Assistant: 0)
**Session ID**: `1787334864135`
**Model**: minimax-m2-moonshotai/kimi-k2.6


---

## 💬 User #1

_2026-08-21 18:07:28Z_

<task>
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
==> Running 'npm start'
> chamundeshwari-server@1.0.0 start
> node server.js
Server startup failed: MongoDB connection failed: Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted. Make sure your current IP address is on your Atlas cluster's IP whitelist: https://www.mongodb.com/docs/atlas/security-whitelistAction: Explain the selected code or concept in simple terms (see below for action prompt)
</task>

<action_prompt type="explain">
Explain how the code in the active editor works, including its purpose and logic. If a specific file, terminal output, or code block is provided, use that instead.
</action_prompt>

Environment details:

# VSCode Visible Files
server/.env

# VSCode Open Tabs
README.md

# Current Working Directory (d:/My Shop Website) Files
.gitignore
package.json
README.md
TODO.md
admin/
admin/.gitignore
admin/index.html
admin/package-lock.json
admin/package.json
admin/README.md
admin/vite.config.js
admin/public/
admin/public/placeholder-sweet.svg
admin/src/
admin/src/App.jsx
admin/src/main.jsx
admin/src/components/
admin/src/components/OrderNotifications.jsx
admin/src/css/
admin/src/css/admin.css
admin/src/css/global.css
admin/src/css/notification.css
admin/src/css/tokens.css
admin/src/hooks/
admin/src/hooks/useOrderStream.js
admin/src/pages/
admin/src/pages/AdminLayout.jsx
admin/src/pages/CounterQR.jsx
admin/src/pages/Dashboard.jsx
admin/src/pages/FeedbackView.jsx
admin/src/pages/OrdersManage.jsx
admin/src/pages/ProductManage.jsx
admin/src/services/
admin/src/services/api.js
admin/src/utils/
admin/src/utils/printBill.js
client/
client/index.html
client/package-lock.json
client/package.json
client/vercel.json
client/vite.config.js
client/public/
client/public/placeholder-sweet.svg
client/src/
client/src/App.jsx
client/src/main.jsx
client/src/assets/
client/src/components/
client/src/components/CartPopup.jsx
client/src/components/Footer.jsx
client/src/components/GramSelector.jsx
client/src/components/Navbar.jsx
client/src/components/ProductCard.jsx
client/src/context/
client/src/context/CartContext.jsx
client/src/css/
client/src/css/about.css
client/src/css/cart.css
client/src/css/cartpopup.css
client/src/css/checkout.css
client/src/css/counterorder.css
client/src/css/footer.css
client/src/css/global.css
client/src/css/gramselector.css
client/src/css/home.css
client/src/css/invoice.css
client/src/css/navbar.css
client/src/css/productcard.css
client/src/css/productdetail.css
client/src/css/products.css
client/src/css/tokens.css
client/src/pages/
client/src/pages/About.jsx
client/src/pages/Cart.jsx
client/src/pages/Checkout.jsx
client/src/pages/CounterOrder.jsx
client/src/pages/Home.jsx
client/src/pages/OrderSuccess.jsx
client/src/pages/ProductDetail.jsx
client/src/pages/Products.jsx
client/src/services/
client/src/services/api.js
client/src/utils/
client/src/utils/printBill.js
server/
server/package-lock.json
server/package.json
server/server.js
server/config/
server/config/db.js
server/controllers/
server/controllers/authController.js
server/controllers/dashboardController.js
server/controllers/feedbackController.js
server/controllers/orderController.js
server/controllers/productController.js
server/middleware/
server/middleware/rateLimiters.js
server/middleware/upload.js
server/models/
server/models/Admin.js
server/models/Feedback.js
server/models/Order.js
server/models/Product.js
server/routes/
server/routes/dashboard.js
server/routes/feedback.js
server/routes/orders.js
server/routes/products.js
server/uploads/
server/uploads/.gitkeep
server/utils/
server/utils/orderStream.js
server/utils/seedProducts.js
uploads/

