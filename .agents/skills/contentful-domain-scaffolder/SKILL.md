---
name: contentful-domain-scaffolder
description: Scaffold the Contentful data layer for a new content type — a normalizing Client, React Query Handler hooks, and types — following the alesea-merch two-file pattern. Use whenever the user wants to fetch a new content type from Contentful, add data for a domain, connect a Contentful model, or says things like "add data for X", "fetch the Y content type", "connect Z from Contentful", or "I need to load blog posts/collections/pages".
---

# Contentful Domain Scaffolder

Generate the complete data layer for a Contentful content type following the alesea-merch two-file pattern: a normalizing `*Client.ts` + a React Query `*Handler.ts`.

The canonical reference implementation is the **product** domain — read it before generating:

- `src/lib/contentful/index.ts` — the shared client (never re-create it)
- `src/lib/contentful/types/common.ts` — `ICollection<T>`, `IImage`, `toImage()`
- `src/lib/contentful/types/product/{response,query}.ts`
- `src/lib/contentful/product/{productClient,productHandler}.ts`

## Before Starting

Ask the user for (or infer from the request):

- **Content type ID** as configured in Contentful (e.g. `blogPost`, `collection`, `page`).
- **Fields** and their Contentful types (Symbol, Text, Number, Boolean, AssetLink, Array, etc.).
- **Queries needed**: list all entries? by slug? filtered? paginated?

## Files to generate

For a content type `X` (camelCase id, PascalCase `Xn`):

```
src/lib/contentful/types/<x>/response.ts   # XSkeleton (raw) + IX (normalized)
src/lib/contentful/types/<x>/query.ts      # IXQuery
src/lib/contentful/<x>/<x>Client.ts        # raw calls + normalize() → IX
src/lib/contentful/<x>/<x>Handler.ts       # React Query hooks + xKeys factory
```

## Rules (non-negotiable)

1. **Normalize at the boundary.** The client maps `Entry<XSkeleton>` → `IX`. Never return raw Contentful entries. Treat every non-required field as possibly `undefined` and provide sensible defaults.
2. **One client only.** Import `contentful` from `@/lib/contentful`. Never call `createClient`.
3. **Assets via `toImage`.** Map `AssetLink` fields with the shared `toImage()` helper; filter nulls.
4. **Query-key factory.** Export `xKeys = { all, list(query), detail(slug) }`. Never inline key arrays.
5. **Collections** return `ICollection<IX>` (items/total/skip/limit).
6. **`enabled` guards** on dependent queries (e.g. `useGetX(slug)` is `enabled: Boolean(slug)`).

## Skeleton templates

**`response.ts`**

```ts
import type { EntryFieldTypes } from "contentful";
import type { IImage } from "../common";

export interface XSkeleton {
  contentTypeId: "x";
  fields: {
    title: EntryFieldTypes.Symbol;
    slug: EntryFieldTypes.Symbol;
    // …map the rest of the Contentful fields here
  };
}

export interface IX {
  id: string;
  title: string;
  slug: string;
  // …normalized fields
}
```

**`xClient.ts`** — follow `productClient.ts`: a private `normalize(entry)`, an exported `getXs(query)` returning `ICollection<IX>`, and `getXBySlug(slug)` returning `IX | null`.

**`xHandler.ts`** — follow `productHandler.ts`: `xKeys` factory, `useGetXs(query)`, `useGetX(slug)`.

## After generating

- Run `pnpm exec tsc --noEmit` to confirm types resolve.
- Tell the user which Contentful content type ID and field IDs the code expects, so they can verify the model matches.
