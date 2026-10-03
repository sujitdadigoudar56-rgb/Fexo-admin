"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { formatDate, formatMoney } from "@/lib/format";
import type { CustomerDetail } from "@/lib/types";
import { ActiveBadge, Badge, Card, CardHeader, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Switch } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-0.5 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { data: c, loading, error, reload, setData } = useResource<CustomerDetail>(`/customers/${id}/`);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (loading && !c) return <LoadingBlock />;
  if (!c) return null;

  const isSelf = user?.id === c.id;

  async function toggle(field: "is_active" | "is_staff", value: boolean) {
    if (!c) return;
    setBusy(true);
    try {
      const updated = await api.patch<CustomerDetail>(`/customers/${c.id}/`, { [field]: value });
      setData({ ...c, ...updated, addresses: c.addresses, orders: c.orders });
      toast.success("Account updated.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        back={
          <Link href="/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" /> Customers
          </Link>
        }
        title={c.full_name}
        description={`@${c.username} · joined ${formatDate(c.date_joined)}`}
        actions={
          <div className="flex gap-2">
            {c.is_staff && <Badge tone="primary">Staff</Badge>}
            <ActiveBadge active={c.is_active} off="Disabled" />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card className="grid grid-cols-3 gap-4 p-5">
            <Stat label="Orders" value={String(c.order_count)} />
            <Stat label="Total spent" value={formatMoney(c.total_spent)} />
            <Stat label="Avg. order" value={formatMoney(c.order_count ? c.total_spent / c.order_count : 0)} />
          </Card>

          <Card>
            <CardHeader title="Orders" />
            {c.orders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {c.orders.map((o) => (
                    <tr key={o.order_number} className="hover:bg-cream-50">
                      <Td>
                        <Link href={`/orders/${o.order_number}`} className="font-semibold text-primary-600 hover:underline">
                          {o.order_number}
                        </Link>
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
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Contact" />
            <div className="flex flex-col gap-2 p-5 text-sm">
              {c.email ? (
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 hover:text-primary-600">
                  <Mail className="size-4 text-ink-500" aria-hidden /> {c.email}
                </a>
              ) : (
                <span className="text-ink-500">No email</span>
              )}
              {c.phone && (
                <span className="inline-flex items-center gap-2">
                  <Phone className="size-4 text-ink-500" aria-hidden /> {c.phone}
                </span>
              )}
              <p className="mt-2 text-xs text-ink-500">Last sign-in: {formatDate(c.last_login, true)}</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Access" description={isSelf ? "You can't change your own access." : undefined} />
            <div className="flex flex-col gap-4 p-5">
              <Switch
                checked={c.is_active}
                disabled={busy || isSelf}
                onChange={(v) => toggle("is_active", v)}
                label="Account active"
                description="Disabled accounts can't sign in or place orders."
              />
              <Switch
                checked={c.is_staff}
                disabled={busy || isSelf}
                onChange={(v) => toggle("is_staff", v)}
                label="Admin access"
                description="Lets this person sign in to this admin portal."
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Saved addresses" />
            {c.addresses.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-500">No saved addresses.</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {c.addresses.map((a) => (
                  <li key={a.id} className="px-5 py-4 text-sm leading-relaxed">
                    <p className="mb-1 flex items-center gap-2 font-semibold">
                      {a.full_name}
                      <Badge>{a.address_type}</Badge>
                      {a.is_default && <Badge tone="gold">Default</Badge>}
                    </p>
                    <p className="text-ink-700">
                      {a.line1}
                      {a.line2 && `, ${a.line2}`}, {a.city}, {a.state} {a.postal_code}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
