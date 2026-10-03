"use client";

import { useCallback, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError, toFormData, type FieldErrors } from "@/lib/api";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import { useList } from "@/lib/hooks";
import { Button, IconButton } from "@/components/ui/button";
import { Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination, SearchInput, Table, Td, Th, ImageInput } from "@/components/ui/data";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type Row = { id: number } & Record<string, unknown>;

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "switch" | "select" | "image" | "video" | "datetime" | "email" | "url";
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  /** For selects whose empty choice means null (e.g. a parent category). */
  nullable?: boolean;
  wide?: boolean;
  rows?: number;
  step?: string;
};

export type ColumnDef<T> = {
  label: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

export type FilterDef = { name: string; label: string; options: { value: string; label: string }[] };

export type ResourceConfig<T extends Row> = {
  path: string;
  title: string;
  description?: string;
  singular: string;
  searchPlaceholder?: string;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  filters?: FilterDef[];
  defaults: Record<string, unknown>;
  rowLabel: (row: T) => string;
  pageSize?: number;
  ordering?: string;
};

const PAGE_SIZE = 20;

function initialValues(fields: FieldDef[], defaults: Record<string, unknown>, row?: Row) {
  const values: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = row ? row[f.name] : defaults[f.name];
    if (f.type === "datetime") values[f.name] = toLocalInput(raw as string | null);
    else if (f.type === "select") values[f.name] = raw === null || raw === undefined ? "" : String(raw);
    else values[f.name] = raw ?? (f.type === "switch" ? false : f.type === "image" || f.type === "video" ? null : "");
  }
  return values;
}

function serialize(fields: FieldDef[], values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  let hasFile = false;
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === "image" || f.type === "video") {
      // Only send media when a new file was picked; existing URLs stay as-is.
      if (v instanceof File) {
        out[f.name] = v;
        hasFile = true;
      }
      continue;
    }
    if (f.type === "datetime") out[f.name] = fromLocalInput(String(v ?? ""));
    else if (f.type === "number") out[f.name] = v === "" || v === null ? null : Number(v);
    else if (f.type === "select") out[f.name] = v === "" ? (f.nullable ? null : "") : v;
    else out[f.name] = v;
  }
  return hasFile ? toFormData(out) : out;
}

export function FormFields({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: FieldDef[];
  values: Record<string, unknown>;
  errors: FieldErrors;
  onChange: (name: string, value: unknown) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `field-${f.name}`;
        const err = errors[f.name];
        const value = values[f.name];
        const wide = f.wide || f.type === "textarea" || f.type === "image" || f.type === "video";
        if (f.type === "switch") {
          return (
            <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
              <Switch checked={!!value} onChange={(v) => onChange(f.name, v)} label={f.label} description={f.hint} />
            </div>
          );
        }
        return (
          <Field key={f.name} label={f.label} hint={f.hint} error={err} required={f.required} htmlFor={id} className={wide ? "sm:col-span-2" : ""}>
            {f.type === "textarea" ? (
              <Textarea id={id} rows={f.rows ?? 4} value={String(value ?? "")} placeholder={f.placeholder} invalid={!!err} onChange={(e) => onChange(f.name, e.target.value)} />
            ) : f.type === "select" ? (
              <Select id={id} value={String(value ?? "")} invalid={!!err} onChange={(e) => onChange(f.name, e.target.value)}>
                {f.nullable && <option value="">— None —</option>}
                {!f.nullable && !f.required && <option value="">—</option>}
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === "image" || f.type === "video" ? (
              <ImageInput
                value={(value as File | string | null) ?? null}
                accept={f.type === "video" ? "video/*" : "image/*"}
                label={f.type === "video" ? "Upload video" : "Upload image"}
                onChange={(file) => onChange(f.name, file)}
              />
            ) : (
              <Input
                id={id}
                type={f.type === "datetime" ? "datetime-local" : f.type === "text" ? "text" : f.type}
                step={f.step}
                value={String(value ?? "")}
                placeholder={f.placeholder}
                invalid={!!err}
                onChange={(e) => onChange(f.name, e.target.value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

/** Generic list + create/edit modal + delete confirm for simple models. */
export function ResourceManager<T extends Row>({ config, extraActions }: { config: ResourceConfig<T>; extraActions?: React.ReactNode }) {
  const toast = useToast();
  const pageSize = config.pageSize ?? PAGE_SIZE;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data, loading, error, reload } = useList<T>(`/${config.path}/`, {
    page,
    page_size: pageSize,
    search,
    ordering: config.ordering,
    ...filters,
  });

  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openForm = useCallback(
    (row: T | "new") => {
      setEditing(row);
      setErrors({});
      setValues(initialValues(config.fields, config.defaults, row === "new" ? undefined : row));
    },
    [config.fields, config.defaults],
  );

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setErrors({});
    try {
      const body = serialize(config.fields, values);
      if (editing === "new") await api.post(`/${config.path}/`, body);
      else await api.patch(`/${config.path}/${editing.id}/`, body);
      toast.success(`${config.singular} ${editing === "new" ? "created" : "saved"}.`);
      setEditing(null);
      reload();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors);
        toast.error(e.message);
      } else toast.error("Could not save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/${config.path}/${deleting.id}/`);
      toast.success(`${config.singular} deleted.`);
      setDeleting(null);
      if (data && data.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const hasQuery = !!search || Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <>
            {extraActions}
            <Button onClick={() => openForm("new")}>
              <Plus className="size-4" /> Add {config.singular.toLowerCase()}
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-cream-300 p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={onSearch} placeholder={config.searchPlaceholder} className="sm:max-w-xs sm:flex-1" />
          {config.filters?.map((f) => (
            <Select
              key={f.name}
              aria-label={f.label}
              value={filters[f.name] ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, [f.name]: e.target.value }));
                setPage(1);
              }}
              className="sm:w-44"
            >
              <option value="">{f.label}: All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ))}
        </div>

        {error && <ErrorBlock message={error} onRetry={reload} />}
        {!data && loading && <LoadingBlock />}
        {data && data.results.length === 0 && (
          <EmptyState
            title={hasQuery ? "No matches" : `No ${config.title.toLowerCase()} yet`}
            description={hasQuery ? "Try a different search or filter." : `Create the first ${config.singular.toLowerCase()} to get started.`}
            action={!hasQuery && <Button onClick={() => openForm("new")}><Plus className="size-4" /> Add {config.singular.toLowerCase()}</Button>}
          />
        )}
        {data && data.results.length > 0 && (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Table>
              <thead>
                <tr>
                  {config.columns.map((c) => (
                    <Th key={c.label} className={c.className}>
                      {c.label}
                    </Th>
                  ))}
                  <Th className="w-24 text-right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-cream-50">
                    {config.columns.map((c) => (
                      <Td key={c.label} className={c.className}>
                        {c.render(row)}
                      </Td>
                    ))}
                    <Td className="text-right whitespace-nowrap">
                      <IconButton label={`Edit ${config.rowLabel(row)}`} onClick={() => openForm(row)}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton label={`Delete ${config.rowLabel(row)}`} onClick={() => setDeleting(row)} className="hover:text-danger-500">
                        <Trash2 className="size-4" />
                      </IconButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={pageSize} count={data.count} onPage={setPage} />
          </div>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={editing === "new" ? `New ${config.singular.toLowerCase()}` : `Edit ${config.singular.toLowerCase()}`}
        description={editing && editing !== "new" ? config.rowLabel(editing) : undefined}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editing === "new" ? "Create" : "Save changes"}
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <FormFields fields={config.fields} values={values} errors={errors} onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))} />
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${config.singular.toLowerCase()}?`}
        message={
          <>
            <strong className="text-ink-900">{deleting ? config.rowLabel(deleting) : ""}</strong> will be permanently removed. This can&apos;t be undone.
          </>
        }
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
