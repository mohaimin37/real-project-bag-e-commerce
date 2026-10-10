import { connectDB, disconnectDB } from '../config/db.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

async function main() {
  await connectDB();
  const catBags = await Category.findOne({ slug: 'bags' });
  const catAccessories = await Category.findOne({ slug: 'accessories' });
  const subOffice = await Category.findOne({ slug: 'office-bags' });

  const testProduct = await Product.findOneAndUpdate(
    { slug: 'wildtane-mens-access-key-token-2-rupees-test' },
    {
      $set: {
        name: "WILDTANE Men's Access Key Token (₹2 Payment Gateway Test)",
        slug: 'wildtane-mens-access-key-token-2-rupees-test',
        sku: 'WT-MEN-TST-02',
        gender: 'men',
        price: 2,
        salePrice: null,
        finalPrice: 2,
        category: catBags?._id || catAccessories?._id,
        subcategory: subOffice?._id,
        tagline: "Official ₹2 Payment Gateway Test Piece • Men's Collection",
        badge: '₹2 Test Item',
        shortDescription: 'Official test item priced at exactly ₹2 for validating real Razorpay online checkout and UPI payment.',
        description: "Experience seamless, ultra-secure checkout with the WILDTANE Men's Access Key Token. Engineered for full payment gateway testing with instant order verification, UPI, debit/credit cards, and net banking.",
        stock: 100,
        lowStockThreshold: 10,
        variants: [
          {
            name: 'Onyx Black',
            colorHex: '#17171a',
            colorFamily: 'onyx',
            sku: 'WT-MEN-TST-02-BLK',
            stock: 50,
            images: [{ url: '/uploads/seed/catalog/keyset-onyx.jpg' }]
          },
          {
            name: 'Cognac Brown',
            colorHex: '#96582c',
            colorFamily: 'brown',
            sku: 'WT-MEN-TST-02-BRN',
            stock: 50,
            images: [{ url: '/uploads/seed/catalog/keyfob-brown.jpg' }]
          }
        ],
        images: [
          { url: '/uploads/seed/catalog/keyfob-brown.jpg', alt: 'WILDTANE 2 Rupees Test Item' },
          { url: '/uploads/seed/catalog/keyset-onyx.jpg', alt: 'WILDTANE 2 Rupees Test Item Onyx' }
        ],
        materials: ['Full-Grain Leather', 'Solid Brass Hardware'],
        features: ['Instant Order Verification', 'Zero Extra Shipping', 'UPI & Card Friendly'],
        purposes: ['work', 'transit'],
        isFeatured: true,
        isNewArrival: true,
        isBestseller: true,
        isVisible: true,
        soldCount: 999
      }
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log('Successfully created/updated ₹2 test item:');
  console.log('ID:', testProduct._id);
  console.log('Name:', testProduct.name);
  console.log('Price:', testProduct.price, 'FinalPrice:', testProduct.finalPrice);
  console.log('Gender:', testProduct.gender);
  console.log('Stock:', testProduct.stock);
  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
