"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, EyeOff, Star, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useList } from "@/lib/hooks";
import { cn, formatDate } from "@/lib/format";
import type { Review } from "@/lib/types";
import { Button, IconButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination, SearchInput } from "@/components/ui/data";
import { Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const PAGE_SIZE = 20;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-3.5", n <= rating ? "fill-gold-400 text-gold-400" : "text-cream-400")} aria-hidden />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [approved, setApproved] = useState("");
  const [rating, setRating] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, loading, error, reload } = useList<Review>("/reviews/", {
    page,
    page_size: PAGE_SIZE,
    search,
    is_approved: approved,
    rating,
  });

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  async function setApproval(r: Review, value: boolean) {
    setBusy(r.id);
    try {
      await api.patch(`/reviews/${r.id}/`, { is_approved: value });
      toast.success(value ? "Review approved and visible on the store." : "Review hidden from the store.");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update review.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/reviews/${deleting.id}/`);
      toast.success("Review deleted.");
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete review.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Reviews" description="Moderate product reviews. Only approved reviews appear on the storefront." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-cream-300 p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={onSearch} placeholder="Product, customer or text…" className="sm:max-w-sm sm:flex-1" />
          <Select aria-label="Status" value={approved} onChange={(e) => { setApproved(e.target.value); setPage(1); }} className="sm:w-40">
            <option value="">Status: All</option>
            <option value="false">Hidden</option>
            <option value="true">Approved</option>
          </Select>
          <Select aria-label="Rating" value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} className="sm:w-36">
            <option value="">Rating: All</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n > 1 ? "s" : ""}
              </option>
            ))}
          </Select>
        </div>

        {error && <ErrorBlock message={error} onRetry={reload} />}
        {!data && loading && <LoadingBlock />}
        {data && data.results.length === 0 && <EmptyState icon={<Star className="size-5" />} title="No reviews" description="Customer reviews will show up here." />}
        {data && data.results.length > 0 && (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <ul className="divide-y divide-cream-200">
              {data.results.map((r) => (
                <li key={r.id} className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start", busy === r.id && "opacity-50")}>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={r.rating} />
                      {r.title && <p className="font-semibold">{r.title}</p>}
                      <Badge tone={r.is_approved ? "success" : "warning"} dot>
                        {r.is_approved ? "Approved" : "Hidden"}
                      </Badge>
                    </div>
                    {r.comment && <p className="mt-1.5 max-w-3xl text-sm text-ink-700">{r.comment}</p>}
                    <p className="mt-2 text-xs text-ink-500">
                      {r.user_name} on{" "}
                      <Link href={`/products/${r.product}`} className="font-medium text-ink-700 hover:text-primary-600">
                        {r.product_name}
                      </Link>{" "}
                      · {formatDate(r.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {r.is_approved ? (
                      <Button size="sm" variant="secondary" onClick={() => setApproval(r, false)} disabled={busy === r.id}>
                        <EyeOff className="size-4" /> Hide
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setApproval(r, true)} disabled={busy === r.id}>
                        <Check className="size-4" /> Approve
                      </Button>
                    )}
                    <IconButton label="Delete review" onClick={() => setDeleting(r)} className="hover:text-danger-500">
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleting}
        title="Delete review?"
        message="The review will be permanently removed. Hiding it keeps it on record instead."
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
