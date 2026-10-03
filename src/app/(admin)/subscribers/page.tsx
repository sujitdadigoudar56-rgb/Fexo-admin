"use client";

import { useCallback, useState } from "react";
import { Download, Newspaper, Trash2 } from "lucide-react";
import { api, ApiError, downloadFile } from "@/lib/api";
import { useList } from "@/lib/hooks";
import { formatDate } from "@/lib/format";
import { Button, IconButton } from "@/components/ui/button";
import { Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination, SearchInput, Table, Td, Th } from "@/components/ui/data";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type Subscriber = { id: number; email: string; subscribed_at: string };

const PAGE_SIZE = 25;

export default function SubscribersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState<Subscriber | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { data, loading, error, reload } = useList<Subscriber>("/subscribers/", { page, page_size: PAGE_SIZE, search });

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadFile("/subscribers/export/", "fexo-subscribers.csv");
    } catch {
      toast.error("Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/subscribers/${deleting.id}/`);
      toast.success("Subscriber removed.");
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not remove subscriber.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Subscribers"
        description={data ? `${data.count} newsletter subscriber${data.count === 1 ? "" : "s"}.` : "Newsletter sign-ups from the storefront."}
        actions={
          <Button variant="secondary" onClick={exportCsv} loading={exporting}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />
      <Card>
        <div className="border-b border-cream-300 p-4">
          <SearchInput value={search} onChange={onSearch} placeholder="Search email…" className="sm:max-w-sm" />
        </div>
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {!data && loading && <LoadingBlock />}
        {data && data.results.length === 0 && <EmptyState icon={<Newspaper className="size-5" />} title="No subscribers" />}
        {data && data.results.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Subscribed</Th>
                  <Th className="w-12"><span className="sr-only">Remove</span></Th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((s) => (
                  <tr key={s.id} className="hover:bg-cream-50">
                    <Td className="font-medium">{s.email}</Td>
                    <Td className="text-ink-700">{formatDate(s.subscribed_at, true)}</Td>
                    <Td>
                      <IconButton label={`Remove ${s.email}`} onClick={() => setDeleting(s)} className="hover:text-danger-500">
                        <Trash2 className="size-4" />
                      </IconButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={!!deleting}
        title="Remove subscriber?"
        message={<><strong className="text-ink-900">{deleting?.email}</strong> will stop receiving the newsletter.</>}
        confirmLabel="Remove"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
