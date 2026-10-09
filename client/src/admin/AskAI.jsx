import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { cn } from '../lib/format';
import { Button, Icon, Textarea } from '../components/ui';

/*
 * "Research with ChatGPT / Gemini": copies a ready-made prompt, opens the AI in a new tab (prefilled where the
 * site supports it), and reads the pasted reply back into the product. No API keys: the admin uses their own
 * ChatGPT or Gemini account. The admin tab stays open behind, so coming back is just closing the AI tab.
 */

const APPS = {
  chatgpt: { label: 'ChatGPT', url: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`, tone: 'bg-[#10a37f] text-white' },
  gemini: { label: 'Gemini', url: (q) => `https://gemini.google.com/app?q=${encodeURIComponent(q)}`, tone: 'bg-[#1a73e8] text-white' },
};

// Nearest store colour bucket for an AI-given hex (drives the colour filter).
// Several reference shades per bucket so e.g. khaki lands in tan, not pink.
const FAMILIES = {
  onyx: ['#17171a', '#000000'], grey: ['#8a8a8f', '#36373b', '#c0c0c0'], navy: ['#1b263b', '#000080'], blue: ['#2f5d9b', '#4a90d9', '#87ceeb'],
  teal: ['#1f6f6b', '#008080'], green: ['#3c6e47', '#2e8b57', '#90ee90'], olive: ['#5b5f3a', '#556b2f', '#808000'],
  tan: ['#b8875a', '#d2b48c', '#c3b091', '#d8c3a5', '#c19a6b'], brown: ['#6b4428', '#96582c', '#4a2c1d', '#8b4513'],
  white: ['#f4f1ea', '#ffffff', '#efe6d2'], red: ['#a3242b', '#5e1a24', '#dc143c'], pink: ['#e3a1b4', '#ffc0cb', '#ff69b4'],
  orange: ['#d96b27', '#ffa500', '#e2b93b'],
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function familyOf(hex) {
  const c = rgb(hex);
  const dist = (h) => rgb(h).reduce((s, v, i) => s + (v - c[i]) ** 2, 0);
  return Object.entries(FAMILIES)
    .map(([name, shades]) => [name, Math.min(...shades.map(dist))])
    .sort((a, b) => a[1] - b[1])[0][0];
}

export function buildPrompt({ name, category, subcategory, price, priceRange }) {
  return [
    `I'm adding a product to my online bag store WILDTANE (India, prices in INR ₹).`,
    `Product: "${name}"`,
    category && `Category: ${category}${subcategory ? ` › ${subcategory}` : ''}`,
    price && `My planned price: ₹${price}`,
    priceRange && `Similar products in my store sell for ₹${priceRange.min}–₹${priceRange.max}.`,
    '',
    'Research this kind of product (what buyers in India look for, typical materials, features and prices) and write the listing.',
    'Keep the language simple and honest. Do not invent certifications or brand names.',
    'Reply with ONLY one JSON code block in exactly this shape:',
    '```json',
    JSON.stringify(
      {
        tagline: 'max 6 words',
        shortDescription: '1–2 sentences, max 250 characters',
        description: '2 short paragraphs',
        price: 'number in INR',
        materials: ['max 3'],
        features: ['max 5'],
        purposes: ['any of: work, travel, transit, business, creative'],
        tags: ['5–8 lowercase search words'],
        colours: [{ name: 'colour name', hex: '#rrggbb' }],
        specifications: [{ label: 'e.g. Dimensions', value: 'e.g. 45 × 30 × 15 cm' }],
        faqs: [{ question: '…', answer: '…' }],
      },
      null,
      1
    ),
    '```',
  ]
    .filter((l) => typeof l === 'string')
    .join('\n');
}

/** Pulls the JSON object out of a pasted AI reply (code block or bare). */
function extractJson(text) {
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = block.indexOf('{');
  const end = block.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  const raw = block.slice(start, end + 1).replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strs = (v, max, n) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

/** Turns the AI's JSON into wizard fields. Only fields the AI actually gave are returned. */
export function parseReply(text) {
  const j = extractJson(text);
  if (!j || typeof j !== 'object') return null;
  const out = {};
  if (str(j.tagline)) out.tagline = str(j.tagline, 80);
  if (str(j.shortDescription)) out.shortDescription = str(j.shortDescription, 300);
  if (str(j.description)) out.description = str(j.description, 5000);
  const price = Number(String(j.price ?? '').replace(/[^\d.]/g, ''));
  if (price > 0) out.price = Math.round(price);
  for (const [k, n] of [['materials', 5], ['features', 6]]) if (strs(j[k], 60, n).length) out[k] = strs(j[k], 60, n);
  const purposes = strs(j.purposes, 40, 5).map((x) => x.toLowerCase()).filter((x) => ['work', 'travel', 'transit', 'business', 'creative'].includes(x));
  if (purposes.length) out.purposes = purposes;
  if (strs(j.tags, 40, 10).length) out.tags = strs(j.tags, 40, 10).map((t) => t.toLowerCase());
  const colours = (Array.isArray(j.colours || j.colors) ? j.colours || j.colors : [])
    .map((c) => ({ name: str(c?.name, 60), hex: /^#[0-9a-f]{6}$/i.test(c?.hex || '') ? c.hex.toLowerCase() : '' }))
    .filter((c) => c.name)
    .slice(0, 6);
  if (colours.length) out.colours = colours.map((c) => ({ name: c.name, colorHex: c.hex || '#888888', colorFamily: c.hex ? familyOf(c.hex) : '' }));
  const specs = (Array.isArray(j.specifications) ? j.specifications : []).map((s) => ({ label: str(s?.label, 60), value: str(String(s?.value ?? ''), 200) })).filter((s) => s.label && s.value).slice(0, 10);
  if (specs.length) out.specifications = specs;
  const faqs = (Array.isArray(j.faqs) ? j.faqs : []).map((f) => ({ question: str(f?.question, 200), answer: str(f?.answer, 1000) })).filter((f) => f.question && f.answer).slice(0, 8);
  if (faqs.length) out.faqs = faqs;
  return Object.keys(out).length ? out : null;
}

const NAMES = { tagline: 'short line', shortDescription: 'summary', description: 'description', price: 'price', materials: 'materials', features: 'features', purposes: 'uses', tags: 'search words', colours: 'colours', specifications: 'specifications', faqs: 'FAQs' };

/**
 * Panel with the two AI buttons and a paste box.
 * `context` feeds the prompt; `onApply(fields)` receives the parsed reply.
 */
export default function AskAI({ context, onApply, compact }) {
  const [opened, setOpened] = useState(null); // which app we sent them to
  const [back, setBack] = useState(false); // they returned to this tab
  const [text, setText] = useState('');
  const boxRef = useRef(null);
  const prompt = buildPrompt(context);
  const ready = (context.name || '').trim().length >= 3;

  // "Back" from ChatGPT/Gemini: when this tab regains focus, open the paste box ready to go.
  useEffect(() => {
    if (!opened) return undefined;
    const onBack = () => {
      if (document.visibilityState !== 'visible') return;
      setBack(true);
      setTimeout(() => boxRef.current?.focus(), 50);
    };
    document.addEventListener('visibilitychange', onBack);
    return () => document.removeEventListener('visibilitychange', onBack);
  }, [opened]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      return true;
    } catch {
      return false;
    }
  };

  const open = async (key) => {
    const copied = await copy();
    window.open(APPS[key].url(prompt), '_blank', 'noopener');
    setOpened(key);
    setBack(false);
    toast.success(copied ? `Question copied. If ${APPS[key].label} opens empty, press Ctrl+V and Enter.` : `${APPS[key].label} opened.`, { duration: 6000 });
  };

  const apply = (raw) => {
    const fields = parseReply(raw);
    if (!fields) {
      toast.error('Couldn’t read that. Copy the whole reply (including the { … } part) and paste again.');
      return;
    }
    onApply(fields);
    setText('');
    setOpened(null);
    setBack(false);
    toast.success(`Filled: ${Object.keys(fields).map((k) => NAMES[k]).join(', ')}`, { duration: 5000 });
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t.trim()) return toast.error('Clipboard is empty. Copy the AI reply first.');
      apply(t);
    } catch {
      toast('Press Ctrl+V in the box below instead.', { icon: '📋' });
      boxRef.current?.focus();
    }
    return undefined;
  };

  return (
    <div className={cn('rounded-xl border border-surface-container-high flex flex-col gap-3', compact ? 'p-3' : 'p-space-md')}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="travel_explore" className="text-[20px] text-secondary" />
        <p className="text-[13px] font-semibold flex-1 min-w-[180px]">
          Research with AI
          <span className="block font-normal text-on-surface-variant">Opens in a new tab with your question ready. Copy its answer, come back to this tab, paste. Done.</span>
        </p>
        {Object.entries(APPS).map(([key, app]) => (
          <button
            key={key}
            type="button"
            disabled={!ready}
            onClick={() => open(key)}
            title={ready ? `Open ${app.label} in a new tab` : 'Type the product name first'}
            className={cn('inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-semibold disabled:opacity-40 active:scale-95 transition-transform', app.tone)}
          >
            <Icon name="open_in_new" className="text-[16px]" /> {app.label}
          </button>
        ))}
        <Button type="button" variant="ghost" size="sm" icon="content_copy" disabled={!ready} onClick={async () => ((await copy()) ? toast.success('Question copied. Paste it into any AI.') : toast.error('Could not copy'))}>
          Copy question
        </Button>
      </div>

      {opened && (
        <div className={cn('rounded-lg p-3 flex flex-col gap-2 text-[13px]', back ? 'bg-emerald-500/10' : 'bg-surface-container-low')}>
          <p className="flex items-start gap-1.5">
            <Icon name={back ? 'waving_hand' : 'info'} className="text-[16px] shrink-0 mt-0.5" />
            {back ? (
              <span><b>Welcome back!</b> Paste {APPS[opened].label}’s answer below, or press <b>Paste answer</b>.</span>
            ) : (
              <span>
                {APPS[opened].label} is open in another tab. When it has answered, press its <b>copy</b> button (under the reply), then <b>close that tab</b> to come back here.
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" icon="content_paste" onClick={pasteFromClipboard}>Paste answer</Button>
            <Button type="button" size="sm" variant="tonal" icon="open_in_new" onClick={() => open(opened)}>Open {APPS[opened].label} again</Button>
            <Button type="button" size="sm" variant="ghost" icon="close" onClick={() => { setOpened(null); setBack(false); }}>Cancel</Button>
          </div>
        </div>
      )}

      {(opened || text) && (
        <Textarea
          ref={boxRef}
          rows={3}
          value={text}
          placeholder="…or paste the AI answer here (Ctrl+V)"
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text');
            if (t && parseReply(t)) {
              e.preventDefault();
              apply(t);
            }
          }}
        />
      )}
      {text.trim() && <Button type="button" size="sm" icon="auto_fix_high" className="self-start" onClick={() => apply(text)}>Use this answer</Button>}
    </div>
  );
}
