import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, closeDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import Category from '../src/models/Category.js';
import Coupon from '../src/models/Coupon.js';
import HeroSlide from '../src/models/HeroSlide.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';
import logger from '../src/config/logger.js';

const categoryDefinitions = [
  ['Sneakers', 'sneakers'], ['Running', 'running'], ['Formal', 'formal'],
  ['Loafers', 'loafers'], ['Boots', 'boots'], ['Sandals', 'sandals']
];
const brands = ['tread&co', 'Nike', 'Adidas', 'Puma', 'New Balance', 'ASICS', 'Clarks', 'Bata'];
const models = [
  'Aster', 'Monsoon', 'Regent', 'Cinder', 'Mistral', 'Saffron', 'Vertex', 'Heritage', 'Drift', 'Crest',
  'Solstice', 'Pioneer', 'Mariner', 'Metro', 'Cobalt', 'Dawn', 'Summit', 'Craft', 'Terra', 'Tempo',
  'Nova', 'Classic', 'Voyager', 'Cove', 'Stride', 'Luxe', 'Studio', 'Pilot', 'Avenue', 'Sierra',
  'Orbit', 'Canvas', 'Ridge', 'Cloud', 'Motion', 'Court', 'Trail', 'Urban', 'Field', 'Essential',
  'Sculpt', 'Gallery', 'Coast', 'Racer', 'Everyday', 'Pavilion', 'Forma', 'Solis', 'Atlas', 'Noir'
];
const colorways = ['Ivory / Gold', 'Midnight Black', 'Stone Grey', 'Olive Green', 'Cognac Brown', 'Cloud White'];
const shoePhotos = [
  'photo-1542291026-7eec264c27ff', 'photo-1600185365483-26d7a4cc7519',
  'photo-1608231387042-66d1773070a5', 'photo-1543163521-1bf539c55dd2'
];
const stockPhoto = (id, index) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=82&ixlib=rb-4.1.0&sig=${index}`;

function productDefinitions(categories) {
  return models.map((model, index) => {
    const brand = brands[index % brands.length];
    const category = categories[index % categories.length];
    const base = 1999 + ((index * 487) % 23001);
    const price = Math.min(24999, Math.round(base / 100) * 100);
    const mrp = Math.min(24999, Math.ceil((price * (1.18 + (index % 4) * 0.04)) / 100) * 100);
    const slugBrand = brand === 'tread&co' ? 'tread-co' : brand.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and');
    const images = [0, 1, 2].map((offset) => stockPhoto(shoePhotos[(index + offset) % shoePhotos.length], index + offset));
    return {
      title: `${brand} ${model} ${category.name === 'Formal' ? 'Leather Shoe' : category.name === 'Running' ? 'Running Shoe' : category.name === 'Sneakers' ? 'Sneaker' : category.name.slice(0, -1)}`,
      slug: `${slugBrand}-${model.toLowerCase()}-${category.slug}-${index + 1}`,
      brand,
      category: category._id,
      description: `A considered ${category.name.toLowerCase()} silhouette by ${brand}, made for all-day comfort and polished everyday wear. Designed with a cushioned footbed, durable construction, and a versatile ${colorways[index % colorways.length].toLowerCase()} finish.`,
      specifications: {
        material: index % 2 === 0 ? 'Premium leather and engineered textile' : 'Breathable mesh with suede detailing',
        sole: index % 3 === 0 ? 'Cushioned rubber outsole' : 'Flexible lightweight rubber',
        closure: category.name === 'Sandals' ? 'Adjustable buckle' : 'Lace-up',
        countryOfOrigin: 'India',
        fit: 'Regular'
      },
      price,
      mrp,
      images,
      color: colorways[index % colorways.length],
      sizes: [6, 7, 8, 9, 10, 11].map((size) => ({ size, stock: (index * 7 + size * 3) % 24 + 5 })),
      rating: Number((3.8 + ((index * 7) % 12) / 10).toFixed(1)),
      reviewCount: (index * 13) % 180,
      isExclusive: index < 9,
      isActive: true,
      publishedAt: new Date(Date.UTC(2025, index % 12, (index % 27) + 1))
    };
  });
}

async function seed() {
  await connectDatabase();
  const categories = await Promise.all(categoryDefinitions.map(([name, slug], index) => Category.findOneAndUpdate(
    { slug },
    { $set: { name, slug, description: `Explore premium ${name.toLowerCase()} at tread&co.`, image: stockPhoto(shoePhotos[index % shoePhotos.length], index), isActive: true, sortOrder: index } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));

  const definitions = productDefinitions(categories);
  const products = await Promise.all(definitions.map((product) => Product.findOneAndUpdate(
    { slug: product.slug }, { $set: product }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )));

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  await User.findOneAndUpdate(
    { email: env.adminEmail.toLowerCase() },
    { $set: { name: 'tread&co Admin', email: env.adminEmail.toLowerCase(), passwordHash, role: 'admin', isActive: true } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const coupons = [
    { code: 'WELCOME10', type: 'percentage', value: 10, maxDiscount: 1500, minOrder: 1999, description: '10% off your first pair' },
    { code: 'FESTIVE15', type: 'percentage', value: 15, maxDiscount: 2500, minOrder: 4999, description: '15% off festive styles' },
    { code: 'FREESHIP', type: 'free_shipping', value: 0, minOrder: 1499, description: 'Free shipping on your order' },
    { code: 'RUNWAY20', type: 'percentage', value: 20, maxDiscount: 3000, minOrder: 9999, description: '20% off select premium styles' },
    { code: 'FIRSTPAIR500', type: 'fixed', value: 500, minOrder: 2999, description: '₹500 off your first pair' }
  ];
  await Promise.all(coupons.map((coupon) => Coupon.findOneAndUpdate(
    { code: coupon.code }, { $set: { ...coupon, isActive: true, usageLimit: 5000 } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )));

  const stories = [
    ['Sample story 1', 'Mumbai'], ['Sample story 2', 'Bengaluru'], ['Sample story 3', 'Delhi'],
    ['Sample story 4', 'Pune'], ['Sample story 5', 'Jaipur'], ['Sample story 6', 'Kochi']
  ];
  await Promise.all(stories.map(([name, city], index) => HeroSlide.findOneAndUpdate(
    { order: index + 1 },
    { $set: {
      image: stockPhoto(shoePhotos[index % shoePhotos.length], index), name, city,
      quote: 'Preview content only. Replace with a customer story and image shared with consent before publishing.',
      productRef: products[index]._id, order: index + 1, isActive: false
    } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )));

  logger.info(`Seed complete: ${await Product.countDocuments()} products, ${await Category.countDocuments()} categories, ${await Coupon.countDocuments()} coupons, ${await HeroSlide.countDocuments()} hero slides, admin ${env.adminEmail}`);
}

try {
  await seed();
} catch (error) {
  logger.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
  await mongoose.disconnect();
}
