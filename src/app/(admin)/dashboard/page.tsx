"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, IndianRupee, Package, ShoppingBag, TriangleAlert, Users } from "lucide-react";
import { useResource } from "@/lib/hooks";
import { cn, formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { BarList, RevenueChart } from "@/components/charts";
import { Card, CardHeader, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/data";

const RANGES = [7, 30, 90] as const;

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-ink-500">No prior data</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", up ? "text-success-500" : "text-danger-500")}>
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : ""}
      {value}% <span className="font-normal text-ink-500">vs previous period</span>
    </span>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  footer,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  footer: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-semibold text-ink-500">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-sm bg-gold-50 text-gold-600">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl text-ink-900 tabular-nums">{value}</p>
      <div className="mt-1.5">{footer}</div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(30);
  const { data, loading, error, reload } = useResource<DashboardStats>(`/stats/?days=${days}`);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.first_name || user?.username || "admin"}`}
        description="Here's how the store is doing."
        actions={
          <div className="inline-flex rounded-sm border border-cream-300 bg-white p-0.5" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                aria-pressed={days === r}
                className={cn(
                  "h-8 rounded-xs px-3 text-[13px] font-semibold transition-colors",
                  days === r ? "bg-primary-600 text-white" : "text-ink-700 hover:bg-cream-100",
                )}
              >
                {r} days
              </button>
            ))}
          </div>
        }
      />

      {error && <ErrorBlock message={error} onRetry={reload} />}
      {!data && loading && <LoadingBlock />}

      {data && (
        <div className={cn("flex flex-col gap-6 transition-opacity", loading && "opacity-60")}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Revenue" value={formatMoney(data.kpis.revenue)} icon={IndianRupee} footer={<Change value={data.kpis.revenue_change} />} />
            <Kpi label="Orders" value={formatNumber(data.kpis.orders)}               icon={ShoppingBag}
              footer={
                <span className="flex flex-col gap-0.5">
                  <Change value={data.kpis.orders_change} />
                  {data.kpis.awaiting_payment > 0 && (
                    <Link href="/orders" className="text-xs text-warning-500 hover:underline">
                      {data.kpis.awaiting_payment} awaiting online payment
                    </Link>
                  )}
                </span>
              }
            />
            <Kpi
              label="New customers"
              value={formatNumber(data.kpis.new_customers)}
              icon={Users}
              footer={<Change value={data.kpis.new_customers_change} />}
            />
            <Kpi
              label="Avg. order value"
              value={formatMoney(data.kpis.avg_order_value)}
              icon={Package}
              footer={
                <span className="text-xs text-ink-500">
                  {formatNumber(data.kpis.published_products)} of {formatNumber(data.kpis.total_products)} products live
                </span>
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Revenue" description={`Daily revenue, last ${data.days} days (cancelled orders excluded)`} />
              <div className="px-3 pt-4 pb-2">
                <RevenueChart data={data.sales} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Orders by status" description="All time" action={<Link href="/orders" className="text-xs font-semibold text-primary-600 hover:underline">View orders</Link>} />
              <div className="p-5">
                <BarList data={data.status_breakdown.map((s) => ({ label: s.label, value: s.count }))} />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Recent orders"
                action={
                  <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline">
                    All orders <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              {data.recent_orders.length === 0 ? (
                <EmptyState title="No orders yet" description="Orders placed on the storefront will show up here." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Order</Th>
                      <Th>Customer</Th>
                      <Th>Date</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_orders.map((o) => (
                      <tr key={o.id} className="hover:bg-cream-50">
                        <Td>
                          <Link href={`/orders/${o.order_number}`} className="font-semibold text-primary-600 hover:underline">
                            {o.order_number}
                          </Link>
                        </Td>
                        <Td>
                          <p className="font-medium">{o.customer.full_name}</p>
                          <p className="text-xs text-ink-500">{o.customer.email}</p>
                        </Td>
                        <Td className="text-ink-700">{formatDate(o.created_at)}</Td>
                        <Td>
                          <StatusBadge status={o.status} />
                        </Td>
                        <Td className="text-right font-semibold tabular-nums">{formatMoney(o.grand_total)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader title="Top products" description={`By revenue, last ${data.days} days`} />
                {data.top_products.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-ink-500">No sales in this period.</p>
                ) : (
                  <ul className="divide-y divide-cream-200">
                    {data.top_products.map((p, i) => (
                      <li key={`${p.product_id}-${i}`} className="flex items-center gap-3 px-5 py-3 text-sm">
                        <span className="flex size-6 items-center justify-center rounded-full bg-cream-200 text-xs font-semibold text-ink-700">{i + 1}</span>
                        <span className="flex-1 truncate">
                          {p.product_id ? (
                            <Link href={`/products/${p.product_id}`} className="font-medium hover:text-primary-600">
                              {p.product_name}
                            </Link>
                          ) : (
                            p.product_name
                          )}
                          <span className="block text-xs text-ink-500">{formatNumber(p.units)} units</span>
                        </span>
                        <span className="font-semibold tabular-nums">{formatMoney(p.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <CardHeader title="Low stock" description="Sizes at or below their threshold" />
                {data.low_stock.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-ink-500">Everything is well stocked.</p>
                ) : (
                  <ul className="divide-y divide-cream-200">
                    {data.low_stock.map((v) => (
                      <li key={`${v.product_id}-${v.size}`} className="flex items-center gap-3 px-5 py-3 text-sm">
                        <TriangleAlert className={cn("size-4 shrink-0", v.stock_quantity === 0 ? "text-danger-500" : "text-warning-500")} aria-hidden />
                        <Link href={`/products/${v.product_id}`} className="flex-1 truncate font-medium hover:text-primary-600">
                          {v.product_name} <span className="text-ink-500">· {v.size}</span>
                        </Link>
                        <span className={cn("text-xs font-semibold", v.stock_quantity === 0 ? "text-danger-500" : "text-warning-500")}>
                          {v.stock_quantity === 0 ? "Out of stock" : `${v.stock_quantity} left`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
