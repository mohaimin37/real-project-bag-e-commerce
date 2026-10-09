import { useState, useEffect, useId } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, initials, timeAgo } from '../lib/format';
import { Button, Field, Icon, Input, Modal, Stars, Textarea } from './ui';
import { toast } from 'react-hot-toast';
import { useUser } from '../hooks/useStore';
import { prefersReducedMotion } from '../theme/engine';

export const SEED_CUSTOMER_REVIEWS = [
  {
    _id: 'seed-1',
    name: 'Rohan Verma',
    city: 'Gurgaon',
    rating: 5.0,
    message: 'Honestly was hesitant because I usually buy Samsonite or Tumi, but this backpack is insane quality. Carried it on a Delhi-Mumbai flight yesterday, fit easily under the Indigo seat with my 16 inch Legion laptop. The magnetic clip is super addictive too haha.',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    _id: 'seed-2',
    name: 'Priya M.',
    city: 'Bengaluru',
    rating: 5.0,
    message: "Got the tan tote for work and I'm obsessed. I carry my lunch box, laptop, charger, water bottle and diary every day and the straps don't dig into my shoulder at all. Got so many compliments in office already!",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    _id: 'seed-3',
    name: 'Aditya Sen',
    city: 'Kolkata',
    rating: 5.0,
    message: 'Been using the leather briefcase for about 3 weeks now. The leather smells genuine and has that rich feel, not like the cheap PU leather stuff on Amazon. Zippers are buttery smooth. Worth every single rupee.',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    _id: 'seed-4',
    name: 'Sneha Patel',
    city: 'Ahmedabad',
    rating: 5.0,
    message: 'Bought the weekender bag as a birthday gift for my husband. He travels a lot for work and he was so happy with the separate shoe pocket at the bottom. Really neat packaging with a proper dust bag too.',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    _id: 'seed-5',
    name: 'Kabir Joshi',
    city: 'Mumbai',
    rating: 5.0,
    message: "Took this bag on the Mumbai local during morning rush hour. Material is super tough, handles didn't stretch, and when it suddenly rained outside Churchgate my laptop inside was totally dry. 10/10 recommend.",
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    _id: 'seed-6',
    name: 'Ananya Roy',
    city: 'Pune',
    rating: 4.9,
    message: 'The sling bag is so handy for daily errands. Fits my Kindle, phone, keys, lip balm and sanitizer without looking stuffed. Only small thing is I wish the strap was an inch wider, but otherwise love it!',
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    _id: 'seed-7',
    name: 'Vikramaditya',
    city: 'Hyderabad',
    rating: 4.9,
    message: "Security check at Hyderabad airport was a breeze because the clamshell opens flat like a suitcase. Didn't have to pull out all my cables. Premium build, looks very stealthy in all-black.",
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
  },
  {
    _id: 'seed-8',
    name: 'Natasha B.',
    city: 'New Delhi',
    rating: 4.8,
    message: "Ordered the cardholder and wallet set. Leather started developing a really nice darker patina around the corners after two weeks of pocket use. Very slim, doesn't bulge in jeans.",
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    _id: 'seed-9',
    name: 'Sameer Kulkarni',
    city: 'Thane',
    rating: 4.8,
    message: "Delivered in 2 days to Thane. Packaging felt like unboxing an Apple product. The bag has good padding on the back so your laptop doesn't poke your spine when walking.",
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    _id: 'seed-10',
    name: 'Harish Nair',
    city: 'Kochi',
    rating: 4.8,
    message: 'Cabin trolley is solid. Wheels roll completely silent even on rough airport tiles. Traveled to Dubai and back, not a single scratch on the shell. Very satisfied.',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    _id: 'seed-11',
    name: 'Meera Sundaram',
    city: 'Chennai',
    rating: 4.7,
    message: 'Good quality backpacks are hard to find in India at this price point. Clean design, no obnoxious logos splashed across the front. Looks very professional in meetings.',
    createdAt: new Date(Date.now() - 17 * 86400000).toISOString(),
  },
  {
    _id: 'seed-12',
    name: 'Varun Tandon',
    city: 'Noida',
    rating: 4.7,
    message: "The backpack holds its shape even when it's empty, doesn't flop over on the floor. Dedicated sunglasses pocket at the top is a lifesaver.",
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
  {
    _id: 'seed-13',
    name: 'Pooja Agarwal',
    city: 'Jaipur',
    rating: 4.6,
    message: 'Love the minimalist aesthetic. Color is slightly darker than the studio picture but honestly looks even richer in person. Holds my 15-inch MacBook with room to spare.',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    _id: 'seed-14',
    name: 'Arjun Dasgupta',
    city: 'Guwahati',
    rating: 4.6,
    message: 'Solid zipper pulls and good water resistance. Took it on a weekend trek in Meghalaya and everything inside stayed completely dry during drizzle.',
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
  },
  {
    _id: 'seed-15',
    name: 'Divya S.',
    city: 'Chandigarh',
    rating: 4.6,
    message: 'The passport wallet and organizer made our European holiday so stress-free. Coins, foreign cards and boarding passes all in one sleek pouch. Highly recommended.',
    createdAt: new Date(Date.now() - 23 * 86400000).toISOString(),
  },
  {
    _id: 'seed-16',
    name: 'Siddharth Rao',
    city: 'Bengaluru',
    rating: 4.6,
    message: 'Bought this after seeing my colleague use one at our coworking space. The hidden rear anti-theft pocket fits my passport and wallet snugly when travelling in crowded metro cars.',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    _id: 'seed-17',
    name: 'Tanvi Khanna',
    city: 'Ludhiana',
    rating: 4.5,
    message: 'Very spacious and beautifully lined inside. Fabric feels thick and durable. I wish it had an external bottle pocket, but the internal one prevents spills very well.',
    createdAt: new Date(Date.now() - 27 * 86400000).toISOString(),
  },
  {
    _id: 'seed-18',
    name: 'Karan Mehra',
    city: 'Indore',
    rating: 4.5,
    message: 'Quality easily matches international luggage brands charging double the price. The luggage handle pass-through strap on the back made airport connections completely effortless.',
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
  },
  {
    _id: 'seed-19',
    name: 'Ritu Deshmukh',
    city: 'Nagpur',
    rating: 4.5,
    message: 'Such an elegant work tote! The laptop sleeve is properly suspended from the bottom so the laptop doesn’t slam against the table when you put it down. Great engineering.',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    _id: 'seed-20',
    name: 'Aakash Singhal',
    city: 'Lucknow',
    rating: 4.4,
    message: 'Been using it for daily office commute on my bike. Back ventilation is pretty decent in warm weather and the chest strap takes the load off your shoulders nicely.',
    createdAt: new Date(Date.now() - 31 * 86400000).toISOString(),
  },
  {
    _id: 'seed-21',
    name: 'Shruti V.',
    city: 'Vadodara',
    rating: 4.4,
    message: 'Ordered the mini crossbody in olive green. The colour is gorgeous and matches almost everything in my wardrobe. Hardware feels heavy and premium, definitely not plastic.',
    createdAt: new Date(Date.now() - 33 * 86400000).toISOString(),
  },
  {
    _id: 'seed-22',
    name: 'Nikhil Saxena',
    city: 'Bhopal',
    rating: 4.4,
    message: 'The internal organization compartments are so thoughtful. No more tangled charging bricks and earphones. Everything has a dedicated slip slot.',
    createdAt: new Date(Date.now() - 34 * 86400000).toISOString(),
  },
  {
    _id: 'seed-23',
    name: 'Bhavna Chawla',
    city: 'Amritsar',
    rating: 4.3,
    message: 'Delivered quickly to Punjab. Leather feels genuine and supple. Took off half a star only because the delivery courier arrived earlier in the day than the tracking SMS indicated.',
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    _id: 'seed-24',
    name: 'Gaurav Jain',
    city: 'Surat',
    rating: 4.3,
    message: 'Sturdy duffle bag with rugged bottom studs that keep it clean on wet surfaces. Packed enough clothes for a 4-day business trip easily.',
    createdAt: new Date(Date.now() - 37 * 86400000).toISOString(),
  },
  {
    _id: 'seed-25',
    name: 'Ishita Sen',
    city: 'Bhubaneswar',
    rating: 4.3,
    message: 'The zipper pullers have a satisfying tactile weight to them. Stitching along the corners is completely straight without any stray loose threads. Very happy with the purchase.',
    createdAt: new Date(Date.now() - 38 * 86400000).toISOString(),
  },
  {
    _id: 'seed-26',
    name: 'Mohit Kaushik',
    city: 'Faridabad',
    rating: 4.2,
    message: 'Good sleek backpack for office work. Can comfortably carry laptop, iPad, two notebooks and a thermos. Would have loved an extra zip pocket inside the main lid.',
    createdAt: new Date(Date.now() - 39 * 86400000).toISOString(),
  },
  {
    _id: 'seed-27',
    name: 'Kavita Pillai',
    city: 'Coimbatore',
    rating: 4.2,
    message: 'Great quality everyday bag. The fabric resists dog hair and dust surprisingly well compared to my old canvas bag, just wipes clean with a damp microfiber cloth.',
    createdAt: new Date(Date.now() - 41 * 86400000).toISOString(),
  },
  {
    _id: 'seed-28',
    name: 'Neha K.',
    city: 'Dehradun',
    rating: 4.1,
    message: "Looks really stylish and premium. The main compartment is slightly snug if you carry a big lunch tiffin along with your laptop, but for tech and notebooks it's perfect.",
    createdAt: new Date(Date.now() - 42 * 86400000).toISOString(),
  },
  {
    _id: 'seed-29',
    name: 'Rahul Bhatia',
    city: 'Patna',
    rating: 4.0,
    message: 'Build quality is 5/5, no doubt about it. Giving 4 stars because the side bottle pocket is a bit tight for wide 1-litre bottles, fits standard 750ml bottles fine though.',
    createdAt: new Date(Date.now() - 44 * 86400000).toISOString(),
  },
  {
    _id: 'seed-30',
    name: 'Manan Trivedi',
    city: 'Rajkot',
    rating: 3.9,
    message: "Good bag, definitely well-made with nice materials. Just wish it had a small key clip inside the front pocket so I don't have to fish for my house keys at night.",
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
];

export const AVATAR_GRADIENTS = [
  'from-indigo-600 to-violet-500',
  'from-sky-600 to-cyan-500',
  'from-emerald-600 to-teal-500',
  'from-rose-600 to-pink-500',
  'from-purple-600 to-fuchsia-500',
  'from-amber-600 to-orange-500',
  'from-teal-600 to-emerald-500',
  'from-blue-600 to-indigo-500',
];

export function StarInput({ value = 5, onChange, max = 5 }) {
  const [hover, setHover] = useState(0);
  const id = useId();
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const active = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            id={`${id}-${star}`}
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(0)}
            className="p-1 rounded hover:scale-110 active:scale-95 transition-transform"
          >
            <Icon
              name="star"
              fill={active}
              className={cn('text-[26px] transition-colors', active ? 'text-amber-500' : 'text-outline/30')}
            />
          </button>
        );
      })}
    </div>
  );
}

export function WriteReviewModal({ open, onClose }) {
  const qc = useQueryClient();
  const user = useUser();
  const [rating, setRating] = useState(5);
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user?.name && !name) setName(user.name);
  }, [open, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name');
    if (!message.trim() || message.trim().length < 10) return toast.error('Please write at least 10 characters');
    setSubmitting(true);
    try {
      await api.submitComment({
        name: name.trim(),
        city: city.trim(),
        rating: Number(rating),
        message: message.trim(),
      });
      toast.success('Thank you! Your review has been submitted and will appear once approved by our team.');
      setMessage('');
      onClose();
      qc.invalidateQueries({ queryKey: ['comments'] });
    } catch (err) {
      toast.error(err?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Leave a Customer Review">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1.5">
            Your Rating *
          </label>
          <div className="flex items-center gap-3">
            <StarInput value={rating} onChange={setRating} />
            <span className="text-[15px] font-bold text-on-surface">{rating}.0 / 5.0</span>
          </div>
        </div>

        <Field label="Your Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" required />
        </Field>

        <Field label="City / Region" hint="Optional (e.g. Mumbai, Bengaluru)">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" />
        </Field>

        <Field label="Your Experience" required hint="Share how the bag holds up on your commutes, flights, or everyday carry">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="The bag has been incredible on my daily office commute..." required />
        </Field>

        <div className="p-3 rounded-xl bg-surface-container-low text-[12px] text-on-surface-variant flex items-start gap-2.5">
          <Icon name="verified_user" className="text-secondary text-[18px] shrink-0 mt-0.5" />
          <span>Every review is moderated by our team to maintain authentic feedback. Approved reviews are displayed live across the store.</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="tonal" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting} icon="send">Submit Review</Button>
        </div>
      </form>
    </Modal>
  );
}
