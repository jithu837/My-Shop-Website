import rateLimit from "express-rate-limit";

// General API limiter — 200 requests per 15 minutes per IP.
// Applied to all /api/* routes as a baseline.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// Strict limiter for order placement — 20 per 15 minutes per IP.
// Prevents cart-stuffing / checkout spam without blocking genuine customers.
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many orders placed. Please wait a few minutes before trying again." },
});

// Feedback limiter — 10 submissions per 15 minutes per IP.
export const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many feedback submissions. Please wait before submitting again." },
});
