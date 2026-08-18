# Chamundeshwari Admin (Owner Panel)

Ye admin panel ab `client` se alag ek independent React (Vite) app hai.
Isko separately Vercel pe deploy kar sakte ho — jaise `client` deploy kiya tha.

## Local run

```bash
cd admin
npm install
npm run dev
```

Dev mode mein `/api` aur `/uploads` calls Vite proxy se `http://localhost:5000`
(local backend) pe forward hote hain — koi `.env` chahiye nahi local testing ke liye.

## Deploy on Vercel (production)

1. GitHub pe push karo (`admin/` folder ke saath).
2. Vercel pe **New Project** → is repo ko import karo → **Root Directory** = `admin`.
3. Framework preset: **Vite**.
4. Environment Variables mein add karo:
   - `VITE_API_URL` = your Render backend URL, e.g. `https://your-backend-name.onrender.com`
     (no trailing slash)
   - `VITE_PUBLIC_SITE_URL` = your customer site's Vercel URL, e.g. `https://your-site-name.vercel.app`
      (ye wahi customer site hai jo counter QR scan karne pe khulegi)
5. Deploy. Admin panel apne khud ke URL pe live ho jayega, e.g.
   `https://chamundeshwari-admin.vercel.app`.

## Backend CORS

Server already `cors()` (open) use kar raha hai, isliye admin ke naye domain se
API calls automatically allowed honge — kuch change karne ki zarurat nahi.

## Counter QR

**Admin → Counter QR** page pe jaake QR download kar sakte ho. Wo QR
`VITE_PUBLIC_SITE_URL` (customer site) ko point karta hai — usi ko print karke
counter pe stick karna hai. Customer scan karega → seedha tumhara customer site khulega.
