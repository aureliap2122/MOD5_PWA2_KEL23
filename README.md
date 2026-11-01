# Bore & Barrel

A dummy gunshop storefront built as a Progressive Web App. It runs offline
with an app shell, a web app manifest, and a service worker, and uses React +
Vite + Tailwind CSS.

## Setup

```bash
npm install
npm run dev      # dev server with HMR
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Features added in this revision

| Feature | Where |
| --- | --- |
| **Catalog pagination** — server-side (`limit` / `offset` + `Prefer: count=exact`), 9 items per page, numbered pager. Search, category and sort are also done by the server and reset to page 1. Falls back to the bundled catalog (paginated in the browser) when the API is down. | `pages/Catalog.jsx`, `components/common/Pagination.jsx`, `services/gunService.js` |
| **Share link** — every product has a unique URL `/?gun=<id>`. The Share button (cards + detail page) copies it (native share sheet on phones). Opening the link goes straight to that product; browser Back/Forward work. | `utils/share.js`, `components/common/ShareButton.jsx`, `pages/GunDetailPage.jsx`, `App.jsx` |
| **Lazy loading** — pages are split with `React.lazy` + `Suspense` (Profile, Edit Profile, Favorites, Create, Edit, Detail load on first visit); images use `loading="lazy"`, `decoding="async"` and a shimmer placeholder. | `App.jsx`, `components/common/LazyImage.jsx` |
| **Query caching** — in-memory cache with stale-while-revalidate, request de-duplication and invalidation after create / update / delete / review / favourite. | `lib/queryCache.js`, `hooks/useQuery.js`, `hooks/useGuns.js`, `hooks/useFavorites.js`, `hooks/useReviews.js` |
| **Profile restructure** — About and Contact moved into Profile, a Drafts list (resume / discard), and a separate **Edit Profile** page. | `pages/ProfilePage.jsx`, `pages/EditProfilePage.jsx`, `components/profile/*` |

### Cache settings

| Query | `staleTime` |
| --- | --- |
| Product list page | 2 min |
| Product detail | 5 min |
| Category pills | 10 min |
| Favourites / reviews | 1 min |

Fresh data is served without a request; stale data is shown instantly and
refreshed in the background. Any create / edit / delete invalidates every
`['guns', …]` entry.

## Structure

```
.
├── index.html              # HTML shell
├── vite.config.js          # Vite + vite-plugin-pwa (manifest + service worker)
├── public/                 # static assets served at /
└── src/
    ├── main.jsx            # entry, mounts <App/>
    ├── App.jsx             # app shell: navigation, lazy pages, share-link routing
    ├── lib/queryCache.js   # query cache (no external dependency)
    ├── hooks/              # useQuery, useGuns, useFavorites, useReviews, useDebounce
    ├── services/           # API calls (gun, favorite, review, upload, user)
    ├── utils/              # helpers, share links, draft storage
    ├── components/
    │   ├── common/         # Pagination, ShareButton, LazyImage, filters, …
    │   ├── gun/            # GunCard, GunDetail
    │   └── profile/        # AboutSection, ContactSection, DraftsSection
    └── pages/
        ├── Catalog.jsx         # paginated product grid
        ├── GunDetailPage.jsx   # product page / landing page for shared links
        ├── FavoritesPage.jsx
        ├── ProfilePage.jsx     # overview + Drafts + About + Contact
        ├── EditProfilePage.jsx # edit alias / bio / avatar
        ├── CreateGunPage.jsx
        └── EditGunPage.jsx
```
