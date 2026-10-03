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
import { Badge, Card, CardHeader, ErrorBlock, LoadingBlock, PageHeader, PaymentBadge, StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { ConfirmDialog } from "@/components/ui/modal";
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
  const [confirm, setConfirm] = useState<"cancel" | "refund" | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (loading && !order) return <LoadingBlock />;
  if (!order) return null;

  const nextStatus = status || order.status;
  const nextNotes = notes ?? order.notes;
  const dirty = nextStatus !== order.status || nextNotes !== order.notes;

  async function save(patch?: Partial<Pick<Order, "status" | "notes" | "payment_status">>) {
    if (!order) return;
    // Cancelling restocks and (for paid online orders) refunds — confirm first.
    const target = patch?.status ?? nextStatus;
    if (target === "cancelled" && order.status !== "cancelled" && confirm !== "cancel") {
      setConfirm("cancel");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.patch<Order>(`/orders/${order.order_number}/`, patch ?? { status: nextStatus, notes: nextNotes });
      setData(updated);
      setStatus("");
      setNotes(null);
      toast.success(`Order ${updated.order_number} updated.`);
      setConfirm(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update order.");
    } finally {
      setSaving(false);
    }
  }

  const idx = FLOW.indexOf(order.status);
  // Unpaid online orders can't move forward — only be cancelled.
  const advanceTo = !order.awaiting_payment && idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  const paidOnline = order.payment_method === "razorpay" && order.payment_status === "paid";

  async function refund() {
    if (!order) return;
    setBusy(true);
    try {
      const updated = await api.post<Order>(`/orders/${order.order_number}/refund/`, { reason: "Refunded by admin" });
      setData(updated);
      toast.success(`Refund issued for ${updated.order_number}.`);
      setConfirm(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Refund failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        back={
          <Link href="/orders" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 print:hidden">
            <ArrowLeft className="size-4" /> Orders
          </Link>
        }
        title={`Order ${order.order_number}`}
        description={`Placed ${formatDate(order.created_at, true)} · ${order.payment_method === "cod" ? "Cash on delivery" : "Online payment (Razorpay)"}`}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <PaymentBadge method={order.payment_method} status={order.payment_status} />
            {order.awaiting_payment && order.status === "pending" ? <Badge tone="warning">Awaiting payment</Badge> : <StatusBadge status={order.status} />}
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
          <Card>
            <CardHeader title="Payment" action={<PaymentBadge method={order.payment_method} status={order.payment_status} />} />
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 p-5 text-sm">
              <dt className="text-ink-500">Method</dt>
              <dd>{order.payment_method === "razorpay" ? "Online (Razorpay)" : "Cash on delivery"}</dd>
              <dt className="text-ink-500">Amount</dt>
              <dd className="font-semibold">{formatMoney(order.grand_total, true)}</dd>
              {order.paid_at && (
                <>
                  <dt className="text-ink-500">Paid at</dt>
                  <dd>{formatDate(order.paid_at, true)}</dd>
                </>
              )}
              {order.razorpay_order_id && (
                <>
                  <dt className="text-ink-500">Razorpay order</dt>
                  <dd className="font-mono text-xs break-all">{order.razorpay_order_id}</dd>
                </>
              )}
              {order.razorpay_payment_id && (
                <>
                  <dt className="text-ink-500">Payment ID</dt>
                  <dd className="font-mono text-xs break-all">{order.razorpay_payment_id}</dd>
                </>
              )}
              {order.razorpay_refund_id && (
                <>
                  <dt className="text-ink-500">Refund ID</dt>
                  <dd className="font-mono text-xs break-all">{order.razorpay_refund_id}</dd>
                </>
              )}
            </dl>
            {order.awaiting_payment && (
              <p className="mx-5 mb-5 rounded-sm bg-warning-50 px-3 py-2 text-xs text-warning-500">
                The customer hasn&apos;t paid yet. Stock isn&apos;t reserved and the order can&apos;t be fulfilled until payment succeeds.
              </p>
            )}
            {(paidOnline || (order.payment_method === "cod" && order.payment_status === "pending" && order.status !== "cancelled")) && (
              <div className="flex flex-wrap gap-2 border-t border-cream-300 p-4 print:hidden">
                {paidOnline && (
                  <Button variant="secondary" size="sm" onClick={() => setConfirm("refund")}>
                    Refund {formatMoney(order.grand_total)}
                  </Button>
                )}
                {order.payment_method === "cod" && order.payment_status === "pending" && order.status !== "cancelled" && (
                  <Button variant="secondary" size="sm" loading={saving} onClick={() => save({ payment_status: "paid" })}>
                    Mark cash received
                  </Button>
                )}
              </div>
            )}
          </Card>

          <Card className="print:hidden">
            <CardHeader title="Fulfilment" />
            <div className="flex flex-col gap-4 p-5">
              <Field
                label="Status"
                htmlFor="status"
                hint={order.awaiting_payment ? "Unpaid online order — it can only be cancelled." : order.status === "cancelled" ? "Cancelled orders can't be reopened." : undefined}
              >
                <Select id="status" value={nextStatus} disabled={order.status === "cancelled"} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                  {(Object.keys(LABELS) as OrderStatus[])
                    .filter((s) => !order.awaiting_payment || s === "pending" || s === "cancelled")
                    .map((s) => (
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
      <ConfirmDialog
        open={confirm === "cancel"}
        title="Cancel this order?"
        confirmLabel="Cancel order"
        loading={saving}
        message={
          paidOnline
            ? `This refunds ${formatMoney(order.grand_total, true)} to the customer through Razorpay and returns the items to stock.`
            : order.is_finalized
              ? "The items will be returned to stock. This can't be undone."
              : "The order will be cancelled. This can't be undone."
        }
        onConfirm={() => save({ status: "cancelled", notes: nextNotes })}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "refund"}
        title="Refund this payment?"
        confirmLabel="Refund"
        loading={busy}
        message={`${formatMoney(order.grand_total, true)} will be refunded in full to the customer's original payment method via Razorpay. The order status won't change — cancel it too if it won't ship.`}
        onConfirm={refund}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
