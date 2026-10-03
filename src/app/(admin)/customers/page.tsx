"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useList } from "@/lib/hooks";
import { formatDate, formatMoney } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { ActiveBadge, Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination, SearchInput, Table, Td, Th } from "@/components/ui/data";
import { Select } from "@/components/ui/form";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState("false");
  const [active, setActive] = useState("");
  const [ordering, setOrdering] = useState("-date_joined");

  const { data, loading, error, reload } = useList<Customer>("/customers/", {
    page,
    page_size: PAGE_SIZE,
    search,
    is_staff: staff,
    is_active: active,
    ordering,
  });

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  return (
    <>
      <PageHeader title="Customers" description="Registered storefront accounts and their order history." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-cream-300 p-4 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={onSearch} placeholder="Name, username or email…" className="lg:max-w-sm lg:flex-1" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
            <Select aria-label="Account type" value={staff} onChange={(e) => { setStaff(e.target.value); setPage(1); }} className="lg:w-40">
              <option value="false">Customers</option>
              <option value="true">Staff</option>
              <option value="">Everyone</option>
            </Select>
            <Select aria-label="Status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} className="lg:w-36">
              <option value="">Status: All</option>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </Select>
            <Select aria-label="Sort" value={ordering} onChange={(e) => setOrdering(e.target.value)} className="lg:w-44">
              <option value="-date_joined">Newest first</option>
              <option value="date_joined">Oldest first</option>
              <option value="-total_spent">Top spenders</option>
              <option value="-order_count">Most orders</option>
              <option value="-last_login">Recently active</option>
            </Select>
          </div>
        </div>

        {error && <ErrorBlock message={error} onRetry={reload} />}
        {!data && loading && <LoadingBlock />}
        {data && data.results.length === 0 && <EmptyState icon={<Users className="size-5" />} title="No customers found" description="Try a different search or filter." />}
        {data && data.results.length > 0 && (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Phone</Th>
                  <Th>Joined</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Total spent</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-cream-50" onClick={() => router.push(`/customers/${c.id}`)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xs font-semibold text-ink-700">
                          {c.full_name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <Link href={`/customers/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:text-primary-600">
                            {c.full_name}
                          </Link>
                          {c.is_staff && <Badge tone="primary" className="ml-2">Staff</Badge>}
                          <p className="text-xs text-ink-500">{c.email || c.username}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-ink-700">{c.phone || "—"}</Td>
                    <Td className="text-ink-700">{formatDate(c.date_joined)}</Td>
                    <Td className="text-right tabular-nums">{c.order_count}</Td>
                    <Td className="text-right font-semibold tabular-nums">{formatMoney(c.total_spent)}</Td>
                    <Td>
                      <ActiveBadge active={c.is_active} off="Disabled" />
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
