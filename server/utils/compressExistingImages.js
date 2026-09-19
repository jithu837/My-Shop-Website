import mongoose from "mongoose";
import dotenv from "dotenv";
import sharp from "sharp";

dotenv.config();

const compressAllImages = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB!");

    const collection = mongoose.connection.db.collection("products");
    const products = await collection.find({}).toArray();

    console.log(`Found ${products.length} products to check.`);
    let totalOldSize = 0;
    let totalNewSize = 0;
    let compressedCount = 0;

    for (const p of products) {
      if (!p.image || !p.image.startsWith("data:")) {
        console.log(`Skipping ${p.name} (not a base64 image or empty)`);
        continue;
      }

      const [meta, base64Data] = p.image.split(",");
      const inputBuffer = Buffer.from(base64Data, "base64");
      const oldKb = (inputBuffer.length / 1024).toFixed(1);
      totalOldSize += inputBuffer.length;

      // Compress and resize
      const outputBuffer = await sharp(inputBuffer)
        .resize({ width: 600, height: 600, fit: "cover", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const newKb = (outputBuffer.length / 1024).toFixed(1);
      totalNewSize += outputBuffer.length;

      const newBase64 = `data:image/webp;base64,${outputBuffer.toString("base64")}`;

      await collection.updateOne(
        { _id: p._id },
        { $set: { image: newBase64, updatedAt: new Date() } }
      );

      compressedCount++;
      console.log(`✓ ${p.name}: ${oldKb} KB -> ${newKb} KB (-${Math.round((1 - outputBuffer.length / inputBuffer.length) * 100)}%)`);
    }

    console.log(`\n========================================`);
    console.log(`Successfully compressed ${compressedCount} product images!`);
    console.log(`Total size before: ${(totalOldSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total size after:  ${(totalNewSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Saved: ${((totalOldSize - totalNewSize) / 1024 / 1024).toFixed(2)} MB (${Math.round((1 - totalNewSize / totalOldSize) * 100)}% reduction!)`);
    console.log(`========================================`);

    await mongoose.disconnect();
    console.log("Done!");
    process.exit(0);
  } catch (err) {
    console.error("Error compressing images:", err);
    process.exit(1);
  }
};

compressAllImages();
