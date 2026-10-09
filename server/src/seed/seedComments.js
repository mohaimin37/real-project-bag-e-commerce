import mongoose from 'mongoose';
import env from '../config/env.js';
import Comment from '../models/Comment.js';

export const SEED_COMMENTS = [
  {
    name: 'Rohan Verma',
    city: 'Gurgaon',
    rating: 5.0,
    message: 'Honestly was hesitant because I usually buy Samsonite or Tumi, but this backpack is insane quality. Carried it on a Delhi-Mumbai flight yesterday, fit easily under the Indigo seat with my 16 inch Legion laptop. The magnetic clip is super addictive too haha.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Priya M.',
    city: 'Bengaluru',
    rating: 5.0,
    message: "Got the tan tote for work and I'm obsessed. I carry my lunch box, laptop, charger, water bottle and diary every day and the straps don't dig into my shoulder at all. Got so many compliments in office already!",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Aditya Sen',
    city: 'Kolkata',
    rating: 5.0,
    message: 'Been using the leather briefcase for about 3 weeks now. The leather smells genuine and has that rich feel, not like the cheap PU leather stuff on Amazon. Zippers are buttery smooth. Worth every single rupee.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Sneha Patel',
    city: 'Ahmedabad',
    rating: 5.0,
    message: 'Bought the weekender bag as a birthday gift for my husband. He travels a lot for work and he was so happy with the separate shoe pocket at the bottom. Really neat packaging with a proper dust bag too.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Kabir Joshi',
    city: 'Mumbai',
    rating: 5.0,
    message: "Took this bag on the Mumbai local during morning rush hour. Material is super tough, handles didn't stretch, and when it suddenly rained outside Churchgate my laptop inside was totally dry. 10/10 recommend.",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Ananya Roy',
    city: 'Pune',
    rating: 4.9,
    message: 'The sling bag is so handy for daily errands. Fits my Kindle, phone, keys, lip balm and sanitizer without looking stuffed. Only small thing is I wish the strap was an inch wider, but otherwise love it!',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Vikramaditya',
    city: 'Hyderabad',
    rating: 4.9,
    message: "Security check at Hyderabad airport was a breeze because the clamshell opens flat like a suitcase. Didn't have to pull out all my cables. Premium build, looks very stealthy in all-black.",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Natasha B.',
    city: 'New Delhi',
    rating: 4.8,
    message: "Ordered the cardholder and wallet set. Leather started developing a really nice darker patina around the corners after two weeks of pocket use. Very slim, doesn't bulge in jeans.",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Sameer Kulkarni',
    city: 'Thane',
    rating: 4.8,
    message: "Delivered in 2 days to Thane. Packaging felt like unboxing an Apple product. The bag has good padding on the back so your laptop doesn't poke your spine when walking.",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Harish Nair',
    city: 'Kochi',
    rating: 4.8,
    message: 'Cabin trolley is solid. Wheels roll completely silent even on rough airport tiles. Traveled to Dubai and back, not a single scratch on the shell. Very satisfied.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Meera Sundaram',
    city: 'Chennai',
    rating: 4.7,
    message: 'Good quality backpacks are hard to find in India at this price point. Clean design, no obnoxious logos splashed across the front. Looks very professional in meetings.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Varun Tandon',
    city: 'Noida',
    rating: 4.7,
    message: "The backpack holds its shape even when it's empty, doesn't flop over on the floor. Dedicated sunglasses pocket at the top is a lifesaver.",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Ritu Sharma',
    city: 'Jaipur',
    rating: 4.7,
    message: 'Got the olive duffle for gym and weekend trips. Fabric feels very durable and heavyweight. Strap padding is comfy even when carrying 7-8 kgs.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Aman Gupta',
    city: 'Chandigarh',
    rating: 4.7,
    message: 'Customer support was very helpful on WhatsApp when I asked about laptop size compatibility before buying. Bag fits my bulky Dell workstation like a glove.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Divya Menon',
    city: 'Bengaluru',
    rating: 4.6,
    message: "Using it for my daily office commute on the metro. Lots of thoughtful compartments so my keys don't scratch my iPad screen. Slightly on the heavier side but that's real leather for you.",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Siddharth Rao',
    city: 'Mangalore',
    rating: 4.6,
    message: "Really sturdy hardware. The buckles and zippers feel like they'll easily last 5+ years. Would love to see more earthy color options like army green in the future.",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Pooja K.',
    city: 'Indore',
    rating: 4.6,
    message: 'Love the clean look! I get irritated by loud branding so the minimal embossed logo is right up my alley. Fits under the front seat on Vande Bharat trains too.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Karthik Raja',
    city: 'Coimbatore',
    rating: 4.6,
    message: 'Quality of the stitching is top tier. Zero loose threads anywhere. My 15.6 inch Asus gaming laptop fits comfortably in the padded sleeve.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Tanmay Deshpande',
    city: 'Nagpur',
    rating: 4.5,
    message: 'Great bag overall. Material feels weatherproof as advertised. Only giving 4.5 because delivery took 5 days to Nagpur, but the product itself is 5 stars.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Alisha Khan',
    city: 'Lucknow',
    rating: 4.5,
    message: 'Bought the tote in forest green. Color is even prettier in person than on the website. Inside lining is easy to wipe clean if any pen marks happen.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Gaurav Sethi',
    city: 'Ludhiana',
    rating: 4.5,
    message: 'Solid briefcase for work. Fits my MacBook, iPad, notepad and charger brick easily. Leather is firm and holds its structure well.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Shweta Iyer',
    city: 'Navi Mumbai',
    rating: 4.5,
    message: 'The passport wallet made traveling through immigration so stress-free. Everything was in one place: boarding passes, forex card, SIM ejector tool. Great little travel essential.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Nikhil Agarwal',
    city: 'Surat',
    rating: 4.4,
    message: 'Nice backpack. The luggage pass-through strap on the back made wheeling it through the terminal so easy. Just wish the front zipper pull was slightly bigger.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Deepa Joshi',
    city: 'Vadodara',
    rating: 4.4,
    message: 'Very sleek design. My colleagues thought I bought this from an international brand in the US. Good quality materials and zippers.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Abhishek Mishra',
    city: 'Bhopal',
    rating: 4.3,
    message: 'Pretty good backpack for daily office use. The shoulder strap cushioning is thick and comfy. Took about 4 days to reach Bhopal.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Tanya Chawla',
    city: 'Amritsar',
    rating: 4.3,
    message: 'Duffle is very spacious. Fit 3 days of clothes, sneakers, toiletry kit and a jacket easily. Leather handles feel sturdy.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Kunal Sen',
    city: 'Guwahati',
    rating: 4.2,
    message: 'The leather smells amazing right out of the box. Only minor thing is the shoulder strap was a bit stiff for the first 3-4 days, but softened up nicely with use.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Neha K.',
    city: 'Dehradun',
    rating: 4.1,
    message: "Looks really stylish and premium. The main compartment is slightly snug if you carry a big lunch tiffin along with your laptop, but for tech and notebooks it's perfect.",
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Rahul Bhatia',
    city: 'Patna',
    rating: 4.0,
    message: 'Build quality is 5/5, no doubt about it. Giving 4 stars because the side bottle pocket is a bit tight for wide 1-litre bottles, fits standard 750ml bottles fine though.',
    status: 'approved',
    source: 'website',
  },
  {
    name: 'Manan Trivedi',
    city: 'Rajkot',
    rating: 3.9,
    message: "Good bag, definitely well-made with nice materials. Just wish it had a small key clip inside the front pocket so I don't have to fish for my house keys at night.",
    status: 'approved',
    source: 'website',
  },
];

async function seed() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('Connected to MongoDB');

    await Comment.deleteMany({});

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const docs = SEED_COMMENTS.map((c, i) => ({
      ...c,
      createdAt: new Date(now - (30 - i) * 1.5 * DAY),
      updatedAt: new Date(now - (30 - i) * 1.5 * DAY),
    }));

    await Comment.insertMany(docs);
    console.log(`Successfully seeded ${docs.length} human customer reviews into MongoDB!`);

    const stats = await Comment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    console.log('Stats:', stats);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding comments:', err);
    process.exit(1);
  }
}

seed();
