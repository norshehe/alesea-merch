# Contentful change-list — Shop Website Edits (260706)

The storefront's **code changes are done**. The remaining edits below are **content that
lives in Contentful** and must be applied there to appear on the live site — editing code
does not change them, because Contentful values override the in-code fallbacks.

**Space:** `qrm1ftb7ac4w` · **Environment:** `master`
(Note: this is a *different* space from the main Alesea marketing site, `10xzxgzadgtf`.)

> Recommendation: **unpublish** the discontinued products rather than delete them — the
> Delivery API only returns published entries, so unpublishing removes them from the live
> site while keeping them fully recoverable.

---

## 0. Content model — add a field (do this FIRST)

Content type **`product`** → add a field:

| Property | Value |
| --- | --- |
| Field ID | `comingSoon` |
| Name | `Coming Soon` |
| Type | **Boolean** |
| Default | `No` (false) |

Then **save & publish** the content type. (The code already reads this field:
`productClient.ts` maps `comingSoon`, and the UI renders a "Notify Me" card / teaser
instead of price + Add to Bag when it's `true`.)

---

## 1. Products — reduce 8 → 3

### Repurpose these 3 entries (edit fields, keep published)

#### A. Entry `jWPVUiRER2xyNIRR6rrhG` (currently "Baroro Sunrise Tee") → **Alesea Weekender Tee**
| Field | New value |
| --- | --- |
| `title` | `Alesea Weekender Tee` |
| `slug` | `weekender-tee` |
| `category` | `tees` |
| `price` | `1100` |
| `currency` | `PHP` |
| `blurb` | `A sun-warmed tee that goes best with a fresh tan. Oversized, relaxed fit, Alesea Weekender script on the chest, and on the back, a collector's stamp of everything a good Alesea weekend is made of. Morning coffee, open water, irresistible beddings, no plans.` |
| `materials` | `230 GSM premium cotton blend. Ribbed collar holds its shape, wash after wash. Deep dye, no fading under summer sun.` |
| `colors` | `[{ "name": "Beige", "hex": "#D9CBB2" }]` |
| `sizes` | `["S", "M", "L", "XL", "2XL"]` |
| `sizeLabel` | `Size` |
| `comingSoon` | `false` |
| `order` | `1` |
| `images` | Replace with real Weekender Tee photos when available (front + back). |

#### B. Entry `2UveoSx2AA7jeeKIBBKN5K` (currently "Surf Town Tee") → **Alesea Palm Tee**
| Field | New value |
| --- | --- |
| `title` | `Alesea Palm Tee` |
| `slug` | `palm-tee` |
| `category` | `tees` |
| `price` | `1100` |
| `currency` | `PHP` |
| `blurb` | `Clean and simple, ready for sand and city. Oversized, relaxed fit, palm graphic on the left chest. Flip it and you get the full story: a collector's stamp of your favorite Alesea escape. Wear it on the drive down. Wear it on the way back. Probably wear it the week after too.` |
| `materials` | `230 GSM premium cotton blend. Ribbed collar holds its shape, wash after wash. Deep dye, no fading under summer sun.` |
| `colors` | `[{ "name": "White", "hex": "#F5F5F0" }]` |
| `sizes` | `["S", "M", "L", "XL", "2XL"]` |
| `sizeLabel` | `Size` |
| `comingSoon` | `false` |
| `order` | `2` |
| `images` | Replace with real Palm Tee photos when available (front + back). |

#### C. Entry `3Z3k86JNNg7GlGc28h3hm3` (currently "Tammocalao Tote") → **Alesea Weekender Tote** (Coming Soon)
| Field | New value |
| --- | --- |
| `title` | `Alesea Weekender Tote` |
| `slug` | `weekender-tote` |
| `category` | `bags` |
| `price` | `0` (unused while coming soon) |
| `currency` | `PHP` |
| `blurb` | `The Weekender Tote is on its way. Sign up and we'll let you know the moment it lands.` |
| `materials` | *(clear)* |
| `colors` | `[]` |
| `sizes` | `[]` |
| `comingSoon` | **`true`** |
| `order` | `3` |
| `images` | Add a tote teaser image when available. |

### Unpublish these 5 entries (remove from live site; keep for later)
| Entry ID | Current title |
| --- | --- |
| `4WlPSuynWuRqVFmkz7aJ3Z` | Coastline Weekender |
| `6qxSFco0pgj6yLhl91WAZP` | Sunset Cap |
| `4S9ZkZ95jOKA5EilE71pQy` | Dune Bucket Hat |
| `5KWi1s4kBnQV4EI8fkpysw` | Oeste Tumbler |
| `5rKOEjSI7fVAYbtjAkOhlJ` | Morning Swell Bottle |

After edits, **publish** entries A, B, C.

---

## 2. Homepage — entry `a3igINADBYgxQ8SUvJdYm` (content type `homePage`)

| Field | New value |
| --- | --- |
| `heroBody` | `Made for quiet getaways and sunny weekends. Tees and pieces of your favorite stay to bring home.` |
| `assurances` (Trust Bar — replace all 4 items) | See below |
| `heroSecondaryCta` | *(clear — the "Lookbook" button is removed)* |
| `editorialBody` | *(clear — section is now a tee gallery)* |
| `editorialQuote` | *(clear)* |

> Verified against the live entry on 2026-08-27: `carryHeading` already reads
> `Your beach day, fully packed.` and `heroBody` / `assurances` are already applied.
> Still outstanding on this entry: `heroSecondaryCta` (`Lookbook`), `editorialBody`
> and `editorialQuote` are all still populated and need clearing.

`assurances` new value (JSON — 4 items, order matters, icons map by index):
```json
[
  { "title": "Heavyweight, premium material", "body": "230 GSM cotton blend." },
  { "title": "Oversized, unisex fit", "body": "Wear easy from day one." },
  { "title": "Heavy ribbed collar", "body": "Designed to keep its shape, wash after wash." },
  { "title": "Color that stays true", "body": "Deep dye, no fading under summer sun." }
]
```

> Not required to change (already handled): `categoryHeading` is unused now (the 3-card
> category section was removed in code); the product-grid heading "Three ways to bring the
> beach home" is hardcoded in the component.

Then **publish** the homepage entry.

---

## 3. Site settings — entry `3ZJ8kVUn7LeUIZoRftnuVQ` (content type `siteSettings`)

| Field | Current | New value |
| --- | --- | --- |
| `navLinks` | `[{Shop}, {Villas & Suites}, {About}]` | `[]` — remove all header nav links (per "no need to mimic the main site's nav"). Keep just `[{ "label": "Shop", "href": "/products" }]` if you prefer a single Shop link (this is now the in-code default, pointing at the all-products page). |
| `footerBlurb` | `Beachfront villas in La Union — and the goods to remember them by.` | `We can't wait to see you in these.` — the footer tagline is CMS-driven; set this so it matches the new footer mock. |
| `freeShipThreshold` | `2500` | `2500` — no change (already correct). |

> The "← Back to Alesea" link and "Book Now" button are handled in code; footer links
> (Tees, Tote · Coming Soon) are hardcoded in the footer component.

Then **publish** the site-settings entry.

---

## Verification after applying
- Home grid shows exactly 3 cards: Weekender Tee, Palm Tee, Weekender Tote (Notify Me).
- `/products/weekender-tee` and `/products/palm-tee` show ₱1,100, the new copy, and
  Beige / White colors; "Complete the set" shows the other tee + the tote.
- `/products/weekender-tote` shows the teaser + Notify Me (no price / Add to Bag).
- Old product URLs (e.g. `/products/baroro-sunrise-tee`) 404 — expected.
- Hero subheading + Trust Bar show the new copy; header nav shows no Villas/About.
