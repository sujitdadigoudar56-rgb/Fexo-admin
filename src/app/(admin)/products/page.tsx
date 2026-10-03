"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Plus, Star } from "lucide-react";
import { useList, useOptions } from "@/lib/hooks";
import { cn, formatMoney } from "@/lib/format";
import type { Category, ProductListItem } from "@/lib/types";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination, SearchInput, StatusBadge, Table, Td, Th, Thumb } from "@/components/ui/data";
import { Select } from "@/components/ui/form";

const PAGE_SIZE = 20;

function StockCell({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="text-xs font-semibold text-danger-500">Out of stock</span>;
  return <span className={cn("tabular-nums", stock <= 5 && "font-semibold text-warning-500")}>{stock} in stock</span>;
}

export default function ProductsPage() {
  const router = useRouter();
  const categories = useOptions<Category>("/categories/");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [ordering, setOrdering] = useState("-created_at");

  const { data, loading, error, reload } = useList<ProductListItem>("/products/", {
    page,
    page_size: PAGE_SIZE,
    search,
    status,
    category,
    stock,
    ordering,
  });

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const filtered = !!(search || status || category || stock);

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything in the catalog, including drafts and archived items."
        actions={
          <LinkButton href="/products/new">
            <Plus className="size-4" /> Add product
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-cream-300 p-4 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={onSearch} placeholder="Search name or SKU…" className="lg:max-w-xs lg:flex-1" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex">
            <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="lg:w-36">
              <option value="">Status: All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
            <Select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="lg:w-44">
              <option value="">Category: All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select aria-label="Stock" value={stock} onChange={(e) => { setStock(e.target.value); setPage(1); }} className="lg:w-36">
              <option value="">Stock: All</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </Select>
            <Select aria-label="Sort" value={ordering} onChange={(e) => setOrdering(e.target.value)} className="lg:w-40">
              <option value="-created_at">Newest first</option>
              <option value="created_at">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="-price">Price high–low</option>
              <option value="price">Price low–high</option>
              <option value="-updated_at">Recently edited</option>
            </Select>
          </div>
        </div>

        {error && <ErrorBlock message={error} onRetry={reload} />}
        {!data && loading && <LoadingBlock />}
        {data && data.results.length === 0 && (
          <EmptyState
            icon={<Package className="size-5" />}
            title={filtered ? "No matching products" : "No products yet"}
            description={filtered ? "Try a different search or clear the filters." : "Add your first product to start selling."}
            action={!filtered && <LinkButton href="/products/new"><Plus className="size-4" /> Add product</LinkButton>}
          />
        )}
        {data && data.results.length > 0 && (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th className="text-right">Price</Th>
                  <Th>Inventory</Th>
                  <Th>Tags</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-cream-50" onClick={() => router.push(`/products/${p.id}`)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Thumb src={p.image} alt={p.name} className="size-12" />
                        <div>
                          <Link href={`/products/${p.id}`} className="font-semibold hover:text-primary-600" onClick={(e) => e.stopPropagation()}>
                            {p.name}
                          </Link>
                          <p className="text-xs text-ink-500">SKU {p.sku}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-ink-700">{p.category_name}</Td>
                    <Td className="text-right tabular-nums">
                      <span className="font-semibold">{formatMoney(p.price)}</span>
                      {p.compare_at_price && p.compare_at_price > p.price && (
                        <span className="block text-xs text-ink-500 line-through">{formatMoney(p.compare_at_price)}</span>
                      )}
                    </Td>
                    <Td>
                      <StockCell stock={p.total_stock} />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.is_featured && <Badge tone="gold"><Star className="size-3" aria-hidden /> Featured</Badge>}
                        {p.is_new_arrival && <Badge tone="info">New</Badge>}
                        {p.is_trending && <Badge tone="primary">Trending</Badge>}
                        {p.is_best_seller && <Badge tone="success">Best seller</Badge>}
                      </div>
                    </Td>
                    <Td>
                      <StatusBadge status={p.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
          </div>
        )}
      </Card>
    </>
  );
}
