"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Mail, MapPin, Phone, Printer } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { cn, formatDate, formatMoney } from "@/lib/format";
import type { Address, Order, OrderStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Field, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

const FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];
const LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function AddressBlock({ title, address }: { title: string; address: Address | null }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">{title}</p>
      {address ? (
        <address className="text-sm leading-relaxed text-ink-900 not-italic">
          <p className="font-semibold">{address.full_name}</p>
          <p>{address.line1}</p>
          {address.line2 && <p>{address.line2}</p>}
          <p>
            {address.city}, {address.state} {address.postal_code}
          </p>
          <p>{address.country}</p>
          {address.phone && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-ink-700">
              <Phone className="size-3.5" aria-hidden /> {address.phone}
            </p>
          )}
        </address>
      ) : (
        <p className="text-sm text-ink-500">Not provided</p>
      )}
    </div>
  );
}

function Timeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return <p className="rounded-sm bg-danger-50 px-4 py-3 text-sm font-medium text-danger-500">This order was cancelled.</p>;
  }
  const current = FLOW.indexOf(status);
  return (
    <ol className="flex items-start">
      {FLOW.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={cn("absolute top-3.5 right-1/2 h-0.5 w-full", i <= current ? "bg-primary-600" : "bg-cream-300")} aria-hidden />}
            <span
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                done ? "border-primary-600 bg-primary-600 text-white" : "border-cream-300 bg-white text-ink-500",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("mt-2 text-xs", done ? "font-semibold text-ink-900" : "text-ink-500")}>{LABELS[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const toast = useToast();
  const { data: order, loading, error, reload, setData } = useResource<Order>(`/orders/${orderNumber}/`);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [notes, setNotes] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (loading && !order) return <LoadingBlock />;
  if (!order) return null;

  const nextStatus = status || order.status;
  const nextNotes = notes ?? order.notes;
  const dirty = nextStatus !== order.status || nextNotes !== order.notes;

  async function save(patch?: Partial<Pick<Order, "status" | "notes">>) {
    if (!order) return;
    setSaving(true);
    try {
      const updated = await api.patch<Order>(`/orders/${order.order_number}/`, patch ?? { status: nextStatus, notes: nextNotes });
      setData(updated);
      setStatus("");
      setNotes(null);
      toast.success(`Order ${updated.order_number} updated.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update order.");
    } finally {
      setSaving(false);
    }
  }

  const idx = FLOW.indexOf(order.status);
  const advanceTo = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;

  return (
    <>
      <PageHeader
        back={
          <Link href="/orders" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 print:hidden">
            <ArrowLeft className="size-4" /> Orders
          </Link>
        }
        title={`Order ${order.order_number}`}
        description={`Placed ${formatDate(order.created_at, true)} · ${order.payment_method === "cod" ? "Cash on delivery" : order.payment_method}`}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <StatusBadge status={order.status} />
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            {advanceTo && (
              <Button onClick={() => save({ status: advanceTo })} loading={saving}>
                Mark as {LABELS[advanceTo].toLowerCase()}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader title="Progress" />
            <div className="p-6">
              <Timeline status={order.status} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Items" description={`${order.items.reduce((s, i) => s + i.quantity, 0)} units`} />
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Size</Th>
                  <Th className="text-right">Unit price</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <Td>
                      {item.product ? (
                        <Link href={`/products/${item.product}`} className="font-semibold hover:text-primary-600">
                          {item.product_name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{item.product_name}</span>
                      )}
                      {!item.product && <span className="block text-xs text-ink-500">Product no longer exists</span>}
                    </Td>
                    <Td>{item.size || "—"}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(item.unit_price, true)}</Td>
                    <Td className="text-right tabular-nums">{item.quantity}</Td>
                    <Td className="text-right font-semibold tabular-nums">{formatMoney(item.line_total, true)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-y-2 p-5 text-sm">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="text-right tabular-nums">{formatMoney(order.subtotal, true)}</dd>
              <dt className="text-ink-500">GST</dt>
              <dd className="text-right tabular-nums">{formatMoney(order.gst_amount, true)}</dd>
              <dt className="text-ink-500">Shipping</dt>
              <dd className="text-right tabular-nums">{order.shipping_cost ? formatMoney(order.shipping_cost, true) : "Free"}</dd>
              {order.discount_amount > 0 && (
                <>
                  <dt className="text-ink-500">Discount {order.coupon_code && <span className="font-mono text-xs">({order.coupon_code})</span>}</dt>
                  <dd className="text-right text-success-500 tabular-nums">−{formatMoney(order.discount_amount, true)}</dd>
                </>
              )}
              <dt className="border-t border-cream-300 pt-2 font-semibold">Total</dt>
              <dd className="border-t border-cream-300 pt-2 text-right font-display text-lg font-semibold tabular-nums">{formatMoney(order.grand_total, true)}</dd>
            </dl>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="print:hidden">
            <CardHeader title="Fulfilment" />
            <div className="flex flex-col gap-4 p-5">
              <Field label="Status" htmlFor="status">
                <Select id="status" value={nextStatus} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                  {(Object.keys(LABELS) as OrderStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Internal notes" hint="Only visible to staff." htmlFor="notes">
                <Textarea id="notes" rows={4} value={nextNotes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <Button onClick={() => save()} disabled={!dirty} loading={saving}>
                Save changes
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Customer" />
            <div className="flex flex-col gap-1 p-5 text-sm">
              <Link href={`/customers/${order.customer.id}`} className="font-semibold text-primary-600 hover:underline">
                {order.customer.full_name}
              </Link>
              <a href={`mailto:${order.customer.email}`} className="inline-flex items-center gap-1.5 text-ink-700 hover:text-ink-900">
                <Mail className="size-3.5" aria-hidden /> {order.customer.email}
              </a>
            </div>
          </Card>

          <Card>
            <CardHeader title="Addresses" action={<MapPin className="size-4 text-ink-500" aria-hidden />} />
            <div className="flex flex-col gap-5 p-5">
              <AddressBlock title="Shipping" address={order.shipping_address} />
              <AddressBlock title="Billing" address={order.billing_address} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
