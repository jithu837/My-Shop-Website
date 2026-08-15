// Run with: npm run seed  (inside /server, after setting up .env)
// This just gives you 21 starter products so the site isn't empty on first
// run. Edit names, prices, images and stock anytime from the Admin panel.

import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";

dotenv.config();

const products = [
  // ---- Sweets ----
  { name: "Kaju Katli", category: "Sweets", pricePerKg: 900, stockGrams: 5000, description: "Rich cashew fudge diamonds finished with silver varq." },
  { name: "Mysore Pak", category: "Sweets", pricePerKg: 480, stockGrams: 5000, description: "Ghee-roasted gram flour sweet, soft and melt-in-mouth." },
  { name: "Badusha", category: "Sweets", pricePerKg: 400, stockGrams: 4000, description: "Flaky, syrup-soaked disc sweet with a crisp outer layer." },
  { name: "Boondi Laddu", category: "Sweets", pricePerKg: 380, stockGrams: 6000, description: "Classic gram-flour pearls bound into festive laddus." },
  { name: "Rava Laddu", category: "Sweets", pricePerKg: 400, stockGrams: 5000, description: "Roasted semolina laddu with cashew and cardamom." },
  { name: "Gulab Jamun", category: "Sweets", pricePerKg: 350, stockGrams: 6000, description: "Soft khoya dumplings soaked in rose-cardamom syrup." },
  { name: "Kova Burfi", category: "Sweets", pricePerKg: 500, stockGrams: 4000, description: "Milk-solid fudge, slow cooked the traditional way." },
  { name: "Dry Fruit Halwa", category: "Sweets", pricePerKg: 950, stockGrams: 3000, description: "Loaded with cashew, almond, pista and ghee." },
  { name: "Kalakand", category: "Sweets", pricePerKg: 520, stockGrams: 4000, description: "Grainy milk-cake sweet with a delicate texture." },
  { name: "Jangri", category: "Sweets", pricePerKg: 420, stockGrams: 4000, description: "Crisp coiled sweet soaked in saffron sugar syrup." },
  { name: "Putharekulu", category: "Sweets", pricePerKg: 700, stockGrams: 3000, description: "Paper-thin rice sheets layered with ghee and sugar - an Andhra specialty." },
  { name: "Bellam Sunnundalu", category: "Sweets", pricePerKg: 450, stockGrams: 4000, description: "Urad dal laddus sweetened with jaggery, an old-school favourite." },

  // ---- Hots (savory) ----
  { name: "Andhra Mixture", category: "Hots", pricePerKg: 320, stockGrams: 6000, description: "Classic spicy tea-time mixture with sev, peanuts and curry leaves." },
  { name: "Chekkalu", category: "Hots", pricePerKg: 300, stockGrams: 5000, description: "Crispy rice-flour discs seasoned with peanuts and chana dal." },
  { name: "Boondi Mixture", category: "Hots", pricePerKg: 300, stockGrams: 5000, description: "Crunchy boondi tossed with spices, curry leaves and nuts." },
  { name: "Karam Boondi", category: "Hots", pricePerKg: 310, stockGrams: 4000, description: "Spicy gram-flour pearls, a fiery snack-time favourite." },
  { name: "Murukku", category: "Hots", pricePerKg: 340, stockGrams: 4000, description: "Crispy spiral rice-flour snack, deep fried till golden." },
  { name: "Ribbon Pakoda", category: "Hots", pricePerKg: 340, stockGrams: 4000, description: "Ribbon-shaped crispy besan snack, mildly spiced." },
  { name: "Masala Peanuts", category: "Hots", pricePerKg: 280, stockGrams: 5000, description: "Crunchy peanuts coated in a spicy gram-flour crust." },
  { name: "Punugulu Mix", category: "Hots", pricePerKg: 260, stockGrams: 3000, description: "Instant fermented-batter mix for soft, crispy punugulu." },
  { name: "Chegodilu", category: "Hots", pricePerKg: 300, stockGrams: 4000, description: "Crunchy rice-flour rings flavoured with cumin and sesame." },
];

const seed = async () => {
  await connectDB();
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products.`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
