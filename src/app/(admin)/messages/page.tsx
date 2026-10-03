"use client";

import { useCallback, useState } from "react";
import { Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useList } from "@/lib/hooks";
import { cn, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination, SearchInput } from "@/components/ui/data";
import { Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type Message = { id: number; name: string; email: string; subject: string; message: string; is_read: boolean; created_at: string };

const PAGE_SIZE = 20;

export default function MessagesPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [read, setRead] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, loading, error, reload, setData } = useList<Message>("/messages/", { page, page_size: PAGE_SIZE, search, is_read: read });

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  async function markRead(m: Message, value: boolean) {
    try {
      await api.patch(`/messages/${m.id}/`, { is_read: value });
      setData((d) => d && { ...d, results: d.results.map((x) => (x.id === m.id ? { ...x, is_read: value } : x)) });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update message.");
    }
  }

  function toggleOpen(m: Message) {
    const opening = openId !== m.id;
    setOpenId(opening ? m.id : null);
    if (opening && !m.is_read) markRead(m, true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/messages/${deleting.id}/`);
      toast.success("Message deleted.");
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete message.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Messages" description="Enquiries sent through the storefront's contact form." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-cream-300 p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={onSearch} placeholder="Name, email, subject…" className="sm:max-w-sm sm:flex-1" />
          <Select aria-label="Read status" value={read} onChange={(e) => { setRead(e.target.value); setPage(1); }} className="sm:w-40">
            <option value="">All messages</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </Select>
        </div>

        {error && <ErrorBlock message={error} onRetry={reload} />}
        {!data && loading && <LoadingBlock />}
        {data && data.results.length === 0 && <EmptyState icon={<Mail className="size-5" />} title="Inbox is empty" description="Contact form submissions will show up here." />}
        {data && data.results.length > 0 && (
          <>
            <ul className="divide-y divide-cream-200">
              {data.results.map((m) => {
                const open = openId === m.id;
                return (
                  <li key={m.id} className={cn(!m.is_read && "bg-primary-50/40")}>
                    <button type="button" onClick={() => toggleOpen(m)} aria-expanded={open} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-cream-50">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", m.is_read ? "bg-transparent" : "bg-primary-600")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={cn("truncate", !m.is_read && "font-semibold")}>{m.name}</span>
                          <span className="truncate text-xs text-ink-500">{m.email}</span>
                          {!m.is_read && <Badge tone="primary">New</Badge>}
                        </span>
                        <span className={cn("block truncate text-sm", m.is_read ? "text-ink-700" : "font-medium text-ink-900")}>{m.subject || "(no subject)"}</span>
                        {!open && <span className="block truncate text-xs text-ink-500">{m.message}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-ink-500">{formatDate(m.created_at)}</span>
                    </button>
                    {open && (
                      <div className="animate-fade-in px-10 pb-5">
                        <p className="rounded-sm border border-cream-300 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap text-ink-900">{m.message}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Your message to FEXO"}`)}`}
                            className="inline-flex h-8 items-center gap-2 rounded-sm bg-primary-600 px-3 text-[13px] font-semibold text-white hover:bg-primary-700"
                          >
                            <Reply className="size-4" /> Reply by email
                          </a>
                          <Button size="sm" variant="secondary" onClick={() => markRead(m, !m.is_read)}>
                            {m.is_read ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                            Mark as {m.is_read ? "unread" : "read"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(m)} className="hover:text-danger-500">
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleting}
        title="Delete message?"
        message={<>The message from <strong className="text-ink-900">{deleting?.name}</strong> will be permanently removed.</>}
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
