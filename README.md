# FEXO Admin

Staff admin portal for FEXO: a standalone Next.js app that replaces Django's
built-in `/admin/` UI. It talks to the Django backend's staff-only JSON API at
`/api/admin/` (`backend/dashboard/` in the backend repo) using a DRF token.

## Run locally

```bash
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at the backend
npm install
npm run dev                  # http://localhost:3001
```

The backend must allow this origin. Add `http://localhost:3001` (and the
deployed admin URL in production) to `CORS_ALLOWED_ORIGINS` in the backend's `.env`.

Sign in with any **active staff** account (`is_staff=True`), by email or
username. Customer accounts are rejected. To give someone admin access, open
them under **Customers** and turn on "Admin access".

## What's in it

| Section | Backend endpoint |
|---|---|
| Dashboard (KPIs, revenue chart, status breakdown, top products, low stock) | `GET /api/admin/stats/?days=` |
| Orders: list, filters, detail, status and notes | `/api/admin/orders/` |
| Customers: list, detail, activate/deactivate, grant admin | `/api/admin/customers/` |
| Coupons | `/api/admin/coupons/` |
| Products: list, editor, images, per-size inventory | `/api/admin/products/`, `product-images/`, `product-variants/` |
| Categories, Collections | `/api/admin/categories/`, `collections/` |
| Reviews moderation | `/api/admin/reviews/` |
| Banners, Journal, Testimonials, Instagram, FAQs | `/api/admin/banners/`, `journal/`, `testimonials/`, `instagram-posts/`, `faqs/` |
| Messages (contact form), Subscribers (+ CSV export) | `/api/admin/messages/`, `subscribers/` |
| Site settings | `/api/admin/site-settings/` |

## Structure

- `src/app/login`: sign-in screen
- `src/app/(admin)/*`: authenticated pages, wrapped by `AdminShell` (sidebar, top bar, auth guard)
- `src/components/resource-manager.tsx`: config-driven list, modal form and delete for the simpler models
- `src/components/product-editor.tsx`: product create/edit, images and inventory
- `src/lib/api.ts`: fetch wrapper, token storage, `ApiError` with field errors
