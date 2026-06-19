## What I'm building

A full frontend for JAF in the **Bold Typography Noir** direction (off-white canvas, jet-black ink, oversized Inter Tight display, editorial dark featured-drop band). All product, cart, and order data lives in mock files + localStorage. No backend, no payments, no real auth this pass — admin is a mock-locked area you can wire up later.

## Design tokens (locked from selected direction)

- Canvas `#f4f4f5`, Ink `#18181b`, Accent `#3f3f46`
- Display: Inter Tight 500/600, Body: Inter 400/500 (loaded via `<link>` in `__root.tsx`)
- Composition rules ported verbatim: sticky translucent nav, hero with `text-[11vw]` headline + side-by-side intro paragraph and dark CTA, dark featured-drop band with hairline grid, italic quote slab, 3-up category triptych, minimal footer with Lafia/Abuja addresses

## Routes

```text
/                     Home (hero, featured drop, quote, triptych)
/shop                 Catalog grid, filters (category, size, color, price), search
/product/$slug        PDP — gallery, sizes, colors, qty, add-to-cart, reviews, delivery est.
/cart                 Line items, qty edit, subtotal
/checkout             3-step: contact → delivery (Lafia/Abuja zone + fee) → review/place order
/checkout/success     Order ref + WhatsApp follow-up note
/track                Look up order by ref
/wishlist             Saved items
/about                Brand story
/contact              Form + WhatsApp + map iframe
/faq                  Accordion
/admin                Locked behind mock password (3-seat note in UI). Tabs:
                       Products | Orders | Customers | Coupons | Reports
```

Each route gets its own `head()` with unique title, description, og:title, og:description. No og:image until you supply photography.

## Data layer (mock)

- `src/data/products.ts` — 12 seeded products across Tees / Hoodies / Caps with sizes, colors, multi-image arrays, stock, price (₦), tags (New Drop / Limited / Best Seller), 2–3 reviews each
- `src/data/zones.ts` — `[{ id:'lafia', fee:0 }, { id:'abuja', fee:0 }]` placeholders, editable in admin
- `src/lib/cart.ts`, `src/lib/wishlist.ts`, `src/lib/orders.ts` — Zustand stores persisted to localStorage
- Admin edits (products, prices, coupons, zones) write to localStorage so the catalog reflects them immediately; resets on cache clear (a real DB is the follow-up step)

## Checkout flow

1. **Contact** — name, email, phone (Zod validated)
2. **Delivery** — radio: Lafia / Abuja, address, fee shown live, optional notes
3. **Review** — line items, totals, coupon code field, "Place order" → generates `JAF-XXXX` ref, stores order locally, routes to `/checkout/success` with WhatsApp deep-link button pre-filled with order ref

Payment provider integration (Paystack) is stubbed with a disabled "Pay with Paystack" button + note so we can plug it in once you're ready.

## Admin dashboard

`/admin` mock-gated by a single password kept in `src/lib/admin-auth.ts` (clearly marked TODO for real auth). Tabs:

- **Products** — table + drawer to add/edit/delete, image URL inputs, stock toggle
- **Orders** — list from localStorage, status dropdown (New / Packed / Out / Delivered), "assign rider" text field
- **Customers** — derived from orders
- **Coupons** — code, % off, expiry
- **Reports** — daily revenue chart (Recharts) from local orders, top products list

## Imagery

Generates 12 product photos + 1 hero + 3 category shots via the image tool, saved to `src/assets/` and imported as ES modules. Editorial studio aesthetic to match the direction.

## Tech notes

- TanStack Router file routes under `src/routes/`, params via `$slug`, `<Link>` everywhere
- shadcn for table / dialog / drawer / accordion / form / sonner toasts
- Recharts for admin revenue chart
- Zustand + `persist` middleware for cart/wishlist/orders/admin-edited catalog
- Zod for all form schemas
- `useServerFn` / Lovable Cloud are **not** used this pass per your choice — easy to swap in later

## Out of scope (next passes, just say the word)

1. Enable Lovable Cloud → real DB + auth (with admin role for the 3 of you) + secure orders
2. Paystack live integration (needs your public + secret keys)
3. WhatsApp Business catalog sync, email/SMS order updates
4. Two-factor auth, reCAPTCHA, automatic backups
5. SEO sitemap.xml / robots.txt + per-product JSON-LD once products are real
