"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useList } from "@/lib/hooks";
import { cn, formatDate, formatMoney } from "@/lib/format";
import type { OrderListItem } from "@/lib/types";
import { Badge, Card, EmptyState, PaymentBadge, ErrorBlock, LoadingBlock, PageHeader, Pagination, SearchInput, StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Input, Select } from "@/components/ui/form";

const PAGE_SIZE = 20;
const STATUSES = [
  ["", "All"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["processing", "Processing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
] as const;

export default function OrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ordering, setOrdering] = useState("-created_at");

  const { data, loading, error, reload } = useList<OrderListItem>("/orders/", {
    page,
    page_size: PAGE_SIZE,
    search,
    status,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    date_from: dateFrom,
    date_to: dateTo,
    ordering,
  });

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const filtered = !!(search || status || dateFrom || dateTo || paymentMethod || paymentStatus);

  return (
    <>
      <PageHeader title="Orders" description="Track and fulfil customer orders." />

      <div className="mb-4 flex gap-1 overflow-x-auto scroll-thin" role="tablist" aria-label="Filter by status">
        {STATUSES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={cn(
              "h-9 shrink-0 rounded-pill px-4 text-[13px] font-semibold transition-colors",
              status === value ? "bg-primary-600 text-white" : "bg-white text-ink-700 ring-1 ring-cream-300 hover:bg-cream-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-cream-300 p-4 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={onSearch} placeholder="Order number, customer name or email…" className="lg:max-w-sm lg:flex-1" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
            <label className="flex items-center gap-2 text-xs text-ink-500">
              From
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="lg:w-40" />
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-500">
              To
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="lg:w-40" />
            </label>
            <Select aria-label="Payment method" value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className="lg:w-40">
              <option value="">Method: All</option>
              <option value="razorpay">Online (Razorpay)</option>
              <option value="cod">Cash on delivery</option>
            </Select>
            <Select aria-label="Payment status" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="lg:w-40">
              <option value="">Payment: All</option>
              <option value="paid">Paid</option>
              <option value="pending">Unpaid / due</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </Select>
            <Select aria-label="Sort" value={ordering} onChange={(e) => setOrdering(e.target.value)} className="lg:w-44">
              <option value="-created_at">Newest first</option>
              <option value="created_at">Oldest first</option>
              <option value="-grand_total">Highest total</option>
              <option value="grand_total">Lowest total</option>
            </Select>
          </div>
        </div>

        {error && <ErrorBlock message={error} onRetry={reload} />}
        {!data && loading && <LoadingBlock />}
        {data && data.results.length === 0 && (
          <EmptyState
            icon={<ShoppingBag className="size-5" />}
            title={filtered ? "No matching orders" : "No orders yet"}
            description={filtered ? "Try a different search, status or date range." : "Orders placed on the storefront will show up here."}
          />
        )}
        {data && data.results.length > 0 && (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th className="text-right">Items</Th>
                  <Th>Payment</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-cream-50" onClick={() => router.push(`/orders/${o.order_number}`)}>
                    <Td>
                      <Link href={`/orders/${o.order_number}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-primary-600 hover:underline">
                        {o.order_number}
                      </Link>
                    </Td>
                    <Td className="text-ink-700">{formatDate(o.created_at, true)}</Td>
                    <Td>
                      <p className="font-medium">{o.customer.full_name}</p>
                      <p className="text-xs text-ink-500">{o.customer.email}</p>
                    </Td>
                    <Td className="text-right tabular-nums">{o.item_count ?? 0}</Td>
                    <Td>
                      <p className="text-xs text-ink-500">{o.payment_method === "razorpay" ? "Online" : "COD"}</p>
                      <PaymentBadge method={o.payment_method} status={o.payment_status} />
                    </Td>
                    <Td>
                      {o.awaiting_payment && o.status === "pending" ? <Badge tone="warning">Awaiting payment</Badge> : <StatusBadge status={o.status} />}
                    </Td>
                    <Td className="text-right font-semibold tabular-nums">{formatMoney(o.grand_total)}</Td>
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
