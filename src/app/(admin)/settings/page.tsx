"use client";

import { useState } from "react";
import { api, ApiError, type FieldErrors } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, ErrorBlock, LoadingBlock, PageHeader } from "@/components/ui/data";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

type Settings = {
  site_name: string;
  tagline: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
};

const SECTIONS: { title: string; description: string; fields: { name: keyof Settings; label: string; type?: string; placeholder?: string }[] }[] = [
  {
    title: "Brand",
    description: "Shown in the storefront header, footer and page titles.",
    fields: [
      { name: "site_name", label: "Store name" },
      { name: "tagline", label: "Tagline" },
    ],
  },
  {
    title: "Contact",
    description: "Shown on the contact page and in the footer.",
    fields: [
      { name: "contact_email", label: "Email", type: "email" },
      { name: "contact_phone", label: "Phone", type: "tel" },
      { name: "address", label: "Address" },
    ],
  },
  {
    title: "Social",
    description: "Full profile URLs. Leave blank to hide an icon.",
    fields: [
      { name: "instagram_url", label: "Instagram", type: "url", placeholder: "https://instagram.com/…" },
      { name: "facebook_url", label: "Facebook", type: "url", placeholder: "https://facebook.com/…" },
      { name: "twitter_url", label: "X / Twitter", type: "url", placeholder: "https://x.com/…" },
    ],
  },
];

export default function SettingsPage() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useResource<Settings>("/site-settings/");
  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (loading && !data) return <LoadingBlock />;
  if (!data) return null;

  const values = { ...data, ...draft };
  const dirty = Object.keys(draft).some((k) => draft[k as keyof Settings] !== data[k as keyof Settings]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const updated = await api.patch<Settings>("/site-settings/", draft);
      setData(updated);
      setDraft({});
      toast.success("Settings saved. The storefront picks them up on its next request.");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast.error(err.message);
      } else toast.error("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Site settings"
        description="Store-wide details used across the storefront."
        actions={
          <>
            {dirty && (
              <Button variant="ghost" onClick={() => { setDraft({}); setErrors({}); }}>
                Discard
              </Button>
            )}
            <Button type="submit" disabled={!dirty} loading={saving}>
              Save settings
            </Button>
          </>
        }
      />
      <div className="flex max-w-3xl flex-col gap-6">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader title={section.title} description={section.description} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {section.fields.map((f) => (
                <Field key={f.name} label={f.label} htmlFor={f.name} error={errors[f.name]} className={f.name === "address" ? "sm:col-span-2" : ""}>
                  <Input
                    id={f.name}
                    type={f.type ?? "text"}
                    placeholder={f.placeholder}
                    value={values[f.name] ?? ""}
                    invalid={!!errors[f.name]}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </form>
  );
}
