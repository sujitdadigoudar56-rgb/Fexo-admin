"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, ImagePlus, Star, Trash2 } from "lucide-react";
import { api, ApiError, STOREFRONT_URL, toFormData, type FieldErrors } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { cn, formatDate } from "@/lib/format";
import type { Category, Collection, Product, ProductImage, ProductVariant } from "@/lib/types";
import { Button, IconButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
// Must match Product.COLORS in the backend.
const COLORS = ["Gray", "Navy Blue", "Black", "Brown", "Charcoal", "White", "Beige", "Maroon", "Cement Gray", "Cream", "Olive Green"];

// Mirrors make_variant_sku() in the backend: FX-OS-01 + Navy Blue + M -> FX-OS-01-NAVYBLUE-M
const variantSku = (sku: string, color: string, size: string) => [sku, color.replace(/ /g, "").toUpperCase(), size].filter(Boolean).join("-");
const stockKey = (color: string, size: string) => `${color}|${size}`;
const byColorThenSize = (a: { color: string; size: string }, b: { color: string; size: string }) =>
  COLORS.indexOf(a.color) - COLORS.indexOf(b.color) || SIZES.indexOf(a.size) - SIZES.indexOf(b.size);

export type NewImage = { file: File; color: string };

type FormState = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  collections: number[];
  short_description: string;
  description: string;
  fabric_details: string;
  size_guide: string;
  price: string;
  compare_at_price: string;
  gst_percent: string;
  colors: string[];
  sizes: string[];
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  status: string;
  meta_title: string;
  meta_description: string;
};

function toForm(p?: Product): FormState {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    sku: p?.sku ?? "",
    category: p ? String(p.category) : "",
    collections: p?.collections ?? [],
    short_description: p?.short_description ?? "",
    description: p?.description ?? "",
    fabric_details: p?.fabric_details ?? "",
    size_guide: p?.size_guide ?? "",
    price: p ? String(p.price) : "",
    compare_at_price: p?.compare_at_price != null ? String(p.compare_at_price) : "",
    gst_percent: p ? String(p.gst_percent) : "5",
    colors: p?.colors ?? [],
    sizes: p?.available_sizes ? p.available_sizes.split(",").map((s) => s.trim()).filter(Boolean) : ["S", "M", "L"],
    is_featured: p?.is_featured ?? false,
    is_trending: p?.is_trending ?? false,
    is_new_arrival: p?.is_new_arrival ?? true,
    is_best_seller: p?.is_best_seller ?? false,
    status: p?.status ?? "draft",
    meta_title: p?.meta_title ?? "",
    meta_description: p?.meta_description ?? "",
  };
}

function toPayload(f: FormState) {
  return {
    name: f.name,
    slug: f.slug,
    sku: f.sku,
    category: f.category ? Number(f.category) : null,
    collections: f.collections,
    short_description: f.short_description,
    description: f.description,
    fabric_details: f.fabric_details,
    size_guide: f.size_guide,
    price: f.price === "" ? null : Number(f.price),
    compare_at_price: f.compare_at_price === "" ? null : Number(f.compare_at_price),
    gst_percent: f.gst_percent === "" ? 0 : Number(f.gst_percent),
    colors: COLORS.filter((c) => f.colors.includes(c)),
    available_sizes: SIZES.filter((s) => f.sizes.includes(s)).join(","),
    is_featured: f.is_featured,
    is_trending: f.is_trending,
    is_new_arrival: f.is_new_arrival,
    is_best_seller: f.is_best_seller,
    status: f.status,
    meta_title: f.meta_title,
    meta_description: f.meta_description,
  };
}

export type Draft = { form: FormState; images: { url: string; color: string }[]; stock: Record<string, number> };

// Map one product from an import file: the API payload plus
//   images: ["url", ...] or [{ "url": "...", "color": "Black" }, ...]
//   stock:  { "Black": { "S": 5, "M": 3 }, ... }   (or { "S": 5 } when there is a single colour)
export function fromJson(o: Record<string, unknown>): Draft {
  const form = toForm();
  for (const k of Object.keys(form) as (keyof FormState)[]) {
    if (o[k] == null) continue;
    form[k] = (typeof form[k] === "string" ? String(o[k]) : o[k]) as never;
  }
  if (typeof o.available_sizes === "string") {
    form.sizes = o.available_sizes.split(",").map((s) => s.trim().toUpperCase()).filter((s) => SIZES.includes(s));
  }
  if (!form.colors.length && typeof o.color === "string" && o.color) form.colors = [o.color];
  const stock: Record<string, number> = {};
  for (const [k, v] of Object.entries((o.stock as Record<string, unknown>) ?? {})) {
    if (v && typeof v === "object") for (const [size, n] of Object.entries(v)) stock[stockKey(k, size)] = Number(n) || 0;
    else stock[stockKey(form.colors[0] ?? "", k)] = Number(v) || 0;
  }
  const images = Array.isArray(o.images)
    ? o.images.map((i) => (typeof i === "string" ? { url: i, color: "" } : { url: String(i?.url ?? ""), color: String(i?.color ?? "") }))
    : [];
  return { form, images, stock };
}

// ponytail: browser fetch, so image hosts must allow CORS; move downloading to the backend if they don't.
export async function urlsToFiles(images: { url: string; color: string }[]) {
  const files: NewImage[] = [];
  let failed = 0;
  for (const { url, color } of images) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      files.push({ file: new File([blob], url.split("/").pop()?.split("?")[0] || "image.jpg", { type: blob.type }), color });
    } catch {
      failed++;
    }
  }
  return { files, failed };
}

// Creates the product, then its images and stock. `complete` is false if the product exists but images/stock failed.
export async function createProduct(form: FormState, images: NewImage[], stock: Record<string, number>) {
  // The backend creates one variant per colour x size.
  const product = await api.post<Product>("/products/", toPayload(form));
  try {
    for (const [i, img] of images.entries()) {
      await api.post("/product-images/", toFormData({ product: product.id, image: img.file, color: img.color, alt_text: product.name, display_order: i }));
    }
    await Promise.all(
      product.variants
        .filter((v) => stock[stockKey(v.color, v.size)])
        .map((v) => api.patch(`/product-variants/${v.id}/`, { stock_quantity: stock[stockKey(v.color, v.size)] })),
    );
    return { product, complete: true };
  } catch {
    return { product, complete: false };
  }
}

export function ProductEditor({ product, onSaved }: { product?: Product; onSaved?: (p: Product) => void }) {
  const router = useRouter();
  const toast = useToast();
  const categories = useOptions<Category>("/categories/");
  const collections = useOptions<Collection>("/collections/");
  const [form, setForm] = useState<FormState>(() => toForm(product));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const isNew = !product;

  // Re-seed the form only when a different product loads — image/stock
  // updates refresh `product` too and must not wipe unsaved field edits.
  const [loadedId, setLoadedId] = useState(product?.id);
  if (product?.id !== loadedId) {
    setLoadedId(product?.id);
    setForm(toForm(product));
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const err = (name: string) => errors[name];

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (isNew) {
        const { product: created, complete } = await createProduct(form, newImages, stock);
        // Product exists now; images/stock failing shouldn't lose it, so finish on its edit page.
        if (!complete) {
          toast.error("Product created, but some images or stock didn't save. Finish them here.");
          router.replace(`/products/${created.id}`);
          return;
        }
        toast.success("Product created.");
        router.replace("/products");
        return;
      }
      // The backend adds a variant for every newly ticked colour x size.
      const saved = await api.patch<Product>(`/products/${product.id}/`, toPayload(form));
      toast.success("Product saved.");
      onSaved?.(saved);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors);
        toast.error(e.message);
      } else toast.error("Could not save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!product) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${product.id}/`);
      toast.success("Product deleted.");
      router.replace("/products");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete product.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={save}>
      <PageHeader
        back={
          <Link href="/products" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" /> Products
          </Link>
        }
        title={isNew ? "New product" : product.name}
        description={isNew ? "Fill in the details, images and stock, then create." :`SKU ${product.sku} · last edited ${formatDate(product.updated_at, true)}`}
        actions={
          <>
            {!isNew && product.status === "published" && (
              <a href={`${STOREFRONT_URL}/shop/${product.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-sm border border-cream-300 bg-white px-4 text-sm font-semibold hover:bg-cream-100">
                <ExternalLink className="size-4" /> View on store
              </a>
            )}
            <Button type="submit" loading={saving}>
              {isNew ? "Create product" : "Save changes"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader title="Basic information" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Product name" required error={err("name")} htmlFor="name" className="sm:col-span-2">
                <Input id="name" value={form.name} invalid={!!err("name")} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="SKU" required error={err("sku")} htmlFor="sku">
                <Input id="sku" value={form.sku} invalid={!!err("sku")} onChange={(e) => set("sku", e.target.value)} />
              </Field>
              <Field label="URL slug" hint="Leave blank to generate from the name." error={err("slug")} htmlFor="slug">
                <Input id="slug" value={form.slug} invalid={!!err("slug")} onChange={(e) => set("slug", e.target.value)} />
              </Field>
              <Field label="Short description" hint="One line shown on product cards." error={err("short_description")} htmlFor="short" className="sm:col-span-2">
                <Input id="short" value={form.short_description} maxLength={300} onChange={(e) => set("short_description", e.target.value)} />
              </Field>
              <Field label="Description" required error={err("description")} htmlFor="desc" className="sm:col-span-2">
                <Textarea id="desc" rows={6} value={form.description} invalid={!!err("description")} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Fabric & care" error={err("fabric_details")} htmlFor="fabric">
                <Textarea id="fabric" rows={3} value={form.fabric_details} onChange={(e) => set("fabric_details", e.target.value)} />
              </Field>
              <Field label="Size guide" error={err("size_guide")} htmlFor="sizeguide">
                <Textarea id="sizeguide" rows={3} value={form.size_guide} onChange={(e) => set("size_guide", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pricing" description="Prices in ₹. Set a compare-at price to show the item as on sale." />
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <Field label="Price" required error={err("price")} htmlFor="price">
                <Input id="price" type="number" step="0.01" min="0" value={form.price} invalid={!!err("price")} onChange={(e) => set("price", e.target.value)} />
              </Field>
              <Field label="Compare-at price" error={err("compare_at_price")} htmlFor="compare">
                <Input id="compare" type="number" step="0.01" min="0" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} />
              </Field>
              <Field label="GST %" error={err("gst_percent")} htmlFor="gst">
                <Input id="gst" type="number" step="0.01" min="0" value={form.gst_percent} onChange={(e) => set("gst_percent", e.target.value)} />
              </Field>
              {form.compare_at_price && form.price && Number(form.compare_at_price) > Number(form.price) && (
                <p className="text-xs text-success-500 sm:col-span-3">
                  Shows as {Math.round(((Number(form.compare_at_price) - Number(form.price)) / Number(form.compare_at_price)) * 100)}% off on the storefront.
                </p>
              )}
            </div>
          </Card>

          {product ? <ImagesCard product={product} onChange={onSaved} /> : <NewImagesCard images={newImages} colors={form.colors} onChange={setNewImages} />}
          {product ? (
            <InventoryCard product={product} onChange={onSaved} />
          ) : (
            <Card>
              <CardHeader title="Variants & stock" description="One variant per colour and size, each with its own variant ID. Pick colours and sizes under Attributes." />
              {form.colors.length === 0 || form.sizes.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-500">Select at least one colour and one size.</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Colour</Th>
                      {SIZES.filter((s) => form.sizes.includes(s)).map((s) => <Th key={s}>{s}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {COLORS.filter((c) => form.colors.includes(c)).map((c) => (
                      <tr key={c}>
                        <Td className="font-semibold">{c}</Td>
                        {SIZES.filter((s) => form.sizes.includes(s)).map((s) => (
                          <Td key={s}>
                            <Input type="number" min={0} aria-label={`Stock for ${c} ${s}`} value={stock[stockKey(c, s)] ?? 0} onChange={(e) => setStock((st) => ({ ...st, [stockKey(c, s)]: Math.max(0, Number(e.target.value) || 0) }))} className="h-9 w-20" />
                            <div className="mt-1 text-[11px] text-ink-500">{variantSku(form.sku, c, s)}</div>
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Search engine listing" />
            <div className="grid gap-4 p-5">
              <Field label="SEO title" htmlFor="meta_title" error={err("meta_title")}>
                <Input id="meta_title" maxLength={160} value={form.meta_title} placeholder={form.name} onChange={(e) => set("meta_title", e.target.value)} />
              </Field>
              <Field label="SEO description" htmlFor="meta_desc" error={err("meta_description")}>
                <Textarea id="meta_desc" rows={2} maxLength={300} value={form.meta_description} placeholder={form.short_description} onChange={(e) => set("meta_description", e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Status" action={!isNew ? <StatusBadge status={form.status} /> : undefined} />
            <div className="p-5">
              <Select aria-label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">Draft — hidden from the store</option>
                <option value="published">Published — visible on the store</option>
                <option value="archived">Archived — hidden, kept for records</option>
              </Select>
            </div>
          </Card>

          <Card>
            <CardHeader title="Organization" />
            <div className="flex flex-col gap-4 p-5">
              <Field label="Category" required error={err("category")} htmlFor="category">
                <Select id="category" value={form.category} invalid={!!err("category")} onChange={(e) => set("category", e.target.value)}>
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_name ? `${c.parent_name} › ` : ""}
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Collections" error={err("collections")}>
                {collections.length === 0 ? (
                  <p className="text-sm text-ink-500">No collections yet.</p>
                ) : (
                  <div className="flex flex-col gap-2 rounded-sm border border-cream-300 p-3">
                    {collections.map((c) => (
                      <Checkbox
                        key={c.id}
                        checked={form.collections.includes(c.id)}
                        onChange={(on) => set("collections", on ? [...form.collections, c.id] : form.collections.filter((id) => id !== c.id))}
                        label={
                          <span>
                            {c.name} {c.is_limited_drop && <Badge tone="gold" className="ml-1">Drop</Badge>}
                          </span>
                        }
                      />
                    ))}
                  </div>
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Attributes" />
            <div className="flex flex-col gap-4 p-5">
              <Field label="Colours" hint="Every colour of this design, in one product." error={err("colors")}>
                <Chips options={COLORS} value={form.colors} onChange={(v) => set("colors", v)} />
              </Field>
              <Field label="Available sizes" hint="Each colour x size gets its own variant ID and stock." error={err("available_sizes")}>
                <Chips options={SIZES} value={form.sizes} onChange={(v) => set("sizes", v)} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Merchandising" description="Controls which homepage rails show this product." />
            <div className="flex flex-col gap-4 p-5">
              <Switch checked={form.is_featured} onChange={(v) => set("is_featured", v)} label="Featured" />
              <Switch checked={form.is_new_arrival} onChange={(v) => set("is_new_arrival", v)} label="New arrival" />
              <Switch checked={form.is_trending} onChange={(v) => set("is_trending", v)} label="Trending" />
              <Switch checked={form.is_best_seller} onChange={(v) => set("is_best_seller", v)} label="Best seller" />
            </div>
          </Card>

          {!isNew && (
            <Card className="border-danger-500/30">
              <CardHeader title="Danger zone" />
              <div className="p-5">
                <p className="mb-3 text-sm text-ink-700">Deleting removes the product, its images and stock. Past orders keep their line items.</p>
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" /> Delete product
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete product?"
        message={
          <>
            <strong className="text-ink-900">{product?.name}</strong> will be permanently deleted. Consider archiving instead if you might sell it again.
          </>
        }
        loading={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </form>
  );
}

function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              "h-9 min-w-11 rounded-sm border px-3 text-sm font-semibold transition-colors",
              on ? "border-primary-600 bg-primary-600 text-white" : "border-cream-300 bg-white text-ink-700 hover:bg-cream-100",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// Tag an image with the colour it shows; untagged images show for every colour.
function ImageColorSelect({ value, colors, onChange, disabled }: { value: string; colors: string[]; onChange: (c: string) => void; disabled?: boolean }) {
  return (
    <select
      aria-label="Image colour"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="absolute top-2 right-2 max-w-[60%] rounded-sm border border-cream-300 bg-white/95 px-1 py-0.5 text-[11px]"
    >
      <option value="">All colours</option>
      {(colors.includes(value) || !value ? colors : [...colors, value]).map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}

// Images picked before the product exists; uploaded on create. First one becomes the main image.
function NewImagesCard({ images, colors, onChange }: { images: NewImage[]; colors: string[]; onChange: (f: NewImage[]) => void }) {
  const files = images.map((i) => i.file);
  const previews = useMemo(() => images.map((i) => URL.createObjectURL(i.file)), [images]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const picker = (
    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onChange([...images, ...Array.from(e.target.files ?? []).map((file) => ({ file, color: colors.length === 1 ? colors[0] : "" }))]); e.target.value = ""; }} />
  );

  return (
    <Card>
      <CardHeader
        title="Images"
        description="The first image is used on product cards. Tag each image with its colour."
        action={
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-cream-300 bg-white px-3 text-[13px] font-semibold hover:bg-cream-100">
            <ImagePlus className="size-4" /> Add images
            {picker}
          </label>
        }
      />
      <div className="p-5">
        {files.length === 0 ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-cream-400 bg-cream-50 py-10 text-sm text-ink-500 hover:bg-cream-100">
            <ImagePlus className="size-6" />
            Click to upload product images
            {picker}
          </label>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((src, i) => (
              <li key={src} className={cn("group relative aspect-[3/4] overflow-hidden rounded-sm border bg-cream-100", i === 0 ? "border-primary-600 ring-2 ring-primary-600/20" : "border-cream-300")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={files[i].name} className="size-full object-cover" />
                {i === 0 && <span className="absolute top-2 left-2"><Badge tone="primary">Main</Badge></span>}
                <ImageColorSelect value={images[i].color} colors={colors} onChange={(c) => onChange(images.map((img, j) => (j === i ? { ...img, color: c } : img)))} />
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-ink-900/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {i !== 0 && (
                    <IconButton label="Set as main image" onClick={() => onChange([images[i], ...images.filter((_, j) => j !== i)])} className="bg-white/90 text-ink-900 hover:bg-white">
                      <Star className="size-4" />
                    </IconButton>
                  )}
                  <IconButton label="Remove image" onClick={() => onChange(images.filter((_, j) => j !== i))} className="bg-white/90 text-danger-500 hover:bg-white">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function ImagesCard({ product, onChange }: { product: Product; onChange?: (p: Product) => void }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  async function refresh() {
    onChange?.(await api.get<Product>(`/products/${product.id}/`));
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      let order = product.images.reduce((m, i) => Math.max(m, i.display_order), -1);
      for (const file of Array.from(files)) {
        order += 1;
        await api.post("/product-images/", toFormData({ product: product.id, image: file, alt_text: product.name, display_order: order }));
      }
      toast.success(files.length > 1 ? `${files.length} images uploaded.` : "Image uploaded.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function makePrimary(img: ProductImage) {
    setBusy(img.id);
    try {
      await api.patch(`/product-images/${img.id}/`, { is_primary: true });
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update image.");
    } finally {
      setBusy(null);
    }
  }

  async function setColor(img: ProductImage, color: string) {
    setBusy(img.id);
    try {
      await api.patch(`/product-images/${img.id}/`, { color });
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update image.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(img: ProductImage) {
    setBusy(img.id);
    try {
      await api.delete(`/product-images/${img.id}/`);
      toast.success("Image removed.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not remove image.");
    } finally {
      setBusy(null);
    }
  }

  const images = [...product.images].sort((a, b) => a.display_order - b.display_order);

  return (
    <Card>
      <CardHeader
        title="Images"
        description="The starred image is used on product cards. Tag each image with its colour."
        action={
          <label className={cn("inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-cream-300 bg-white px-3 text-[13px] font-semibold hover:bg-cream-100", uploading && "pointer-events-none opacity-50")}>
            <ImagePlus className="size-4" /> {uploading ? "Uploading…" : "Add images"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
        }
      />
      <div className="p-5">
        {images.length === 0 ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-cream-400 bg-cream-50 py-10 text-sm text-ink-500 hover:bg-cream-100">
            <ImagePlus className="size-6" />
            Click to upload product images
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img) => (
              <li key={img.id} className={cn("group relative aspect-[3/4] overflow-hidden rounded-sm border bg-cream-100", img.is_primary ? "border-primary-600 ring-2 ring-primary-600/20" : "border-cream-300", busy === img.id && "opacity-50")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image} alt={img.alt_text} className="size-full object-cover" />
                {img.is_primary && <span className="absolute top-2 left-2"><Badge tone="primary">Main</Badge></span>}
                <ImageColorSelect value={img.color} colors={product.colors} disabled={busy === img.id} onChange={(c) => setColor(img, c)} />
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-ink-900/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {!img.is_primary && (
                    <IconButton label="Set as main image" onClick={() => makePrimary(img)} className="bg-white/90 text-ink-900 hover:bg-white">
                      <Star className="size-4" />
                    </IconButton>
                  )}
                  <IconButton label="Remove image" onClick={() => remove(img)} className="bg-white/90 text-danger-500 hover:bg-white">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function InventoryCard({ product, onChange }: { product: Product; onChange?: (p: Product) => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<ProductVariant[]>(product.variants);
  const [saving, setSaving] = useState(false);

  // Reset the editable rows whenever the saved variants change.
  const [source, setSource] = useState(product.variants);
  if (source !== product.variants) {
    setSource(product.variants);
    setRows(product.variants);
  }

  const dirty = rows.filter((r) => {
    const orig = product.variants.find((v) => v.id === r.id);
    return orig && (orig.stock_quantity !== r.stock_quantity || orig.low_stock_threshold !== r.low_stock_threshold);
  });

  const update = (id: number, key: "stock_quantity" | "low_stock_threshold", value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: Math.max(0, Number(value) || 0) } : r)));

  async function saveAll() {
    setSaving(true);
    try {
      await Promise.all(
        dirty.map((r) => api.patch(`/product-variants/${r.id}/`, { stock_quantity: r.stock_quantity, low_stock_threshold: r.low_stock_threshold })),
      );
      toast.success("Inventory updated.");
      onChange?.(await api.get<Product>(`/products/${product.id}/`));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update inventory.");
    } finally {
      setSaving(false);
    }
  }

  async function removeVariant(v: ProductVariant) {
    try {
      await api.delete(`/product-variants/${v.id}/`);
      onChange?.(await api.get<Product>(`/products/${product.id}/`));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not remove size.");
    }
  }

  const sorted = [...rows].sort(byColorThenSize);
  const total = rows.reduce((s, r) => s + r.stock_quantity, 0);

  return (
    <Card>
      <CardHeader
        title="Variants & stock"
        description={`${total} units across ${rows.length} variant${rows.length === 1 ? "" : "s"}. Tick colours and sizes under Attributes, then save, to add more.`}
        action={
          <Button size="sm" onClick={saveAll} disabled={!dirty.length} loading={saving}>
            Save inventory
          </Button>
        }
      />
      {sorted.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-500">No variants yet. Select colours and sizes under Attributes and save the product.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Variant ID</Th>
              <Th>Colour</Th>
              <Th>Size</Th>
              <Th>In stock</Th>
              <Th>Low-stock alert at</Th>
              <Th>Status</Th>
              <Th className="w-12"><span className="sr-only">Remove</span></Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => (
              <tr key={v.id}>
                <Td className="font-mono text-xs">{v.sku}</Td>
                <Td>{v.color || "—"}</Td>
                <Td className="font-semibold">{v.size}</Td>
                <Td>
                  <Input type="number" min={0} aria-label={`Stock for ${v.color} ${v.size}`} value={v.stock_quantity} onChange={(e) => update(v.id, "stock_quantity", e.target.value)} className="h-9 w-28" />
                </Td>
                <Td>
                  <Input type="number" min={0} aria-label={`Low stock threshold for ${v.color} ${v.size}`} value={v.low_stock_threshold} onChange={(e) => update(v.id, "low_stock_threshold", e.target.value)} className="h-9 w-28" />
                </Td>
                <Td>
                  {v.stock_quantity === 0 ? (
                    <Badge tone="danger" dot>Out of stock</Badge>
                  ) : v.stock_quantity <= v.low_stock_threshold ? (
                    <Badge tone="warning" dot>Low</Badge>
                  ) : (
                    <Badge tone="success" dot>In stock</Badge>
                  )}
                </Td>
                <Td>
                  <IconButton label={`Remove variant ${v.sku}`} onClick={() => removeVariant(v)} className="hover:text-danger-500">
                    <Trash2 className="size-4" />
                  </IconButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
