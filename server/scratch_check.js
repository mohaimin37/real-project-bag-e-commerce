import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cats = await db.collection('categories').find({}).toArray();
  const prods = await db.collection('products').find({}).project({ category: 1, subcategory: 1, name: 1, isVisible: 1 }).toArray();
  console.log('Total categories:', cats.length);
  console.log('Total products:', prods.length);
  
  const parents = cats.filter(c => !c.parent);
  console.log('Parents count:', parents.length);
  for (const p of parents) {
    const children = cats.filter(c => c.parent && String(c.parent) === String(p._id));
    const pProdCount = prods.filter(pr => String(pr.category) === String(p._id)).length;
    console.log(`Parent: "${p.name}" (slug: ${p.slug}, direct products: ${pProdCount}, children: ${children.length})`);
    for (const ch of children) {
      const chProdCount = prods.filter(pr => String(pr.category) === String(ch._id) || String(pr.subcategory) === String(ch._id)).length;
      console.log(`    Child: "${ch.name}" (slug: ${ch.slug}, products: ${chProdCount})`);
    }
  }

  const travelCats = cats.filter(c => c.name.toLowerCase().includes('travel'));
  console.log('Travel cats:', travelCats.map(c => ({ _id: c._id, name: c.name, slug: c.slug, parent: c.parent })));

  const zeroSubcats = [];
  for (const c of cats.filter(c => c.parent)) {
    const chProdCount = prods.filter(pr => String(pr.category) === String(c._id) || String(pr.subcategory) === String(c._id)).length;
    if (chProdCount === 0) zeroSubcats.push(c.name);
  }
  console.log('Subcategories with 0 products:', zeroSubcats);

  process.exit(0);
}

check();
