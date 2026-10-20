"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/format";
import { createProduct, fromJson, urlsToFiles, type Draft } from "@/components/product-editor";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui/data";
import { useToast } from "@/components/ui/toast";

type Result = { tone: "success" | "warning" | "danger"; text: string };

export default function ImportProductsPage() {
  const toast = useToast();
  const [fileName, setFileName] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [running, setRunning] = useState(false);
  const done = Object.keys(results).length;

  async function load(file: File) {
    try {
      const data = JSON.parse(await file.text());
      setDrafts((Array.isArray(data) ? data : [data]).map(fromJson));
      setFileName(file.name);
      setResults({});
    } catch {
      toast.error("That file isn't valid product JSON.");
    }
  }

  async function run() {
    setRunning(true);
    setResults({});
    let created = 0;
    for (const [i, d] of drafts.entries()) {
      let result: Result;
      try {
        const { files, failed } = await urlsToFiles(d.images);
        const { complete } = await createProduct(d.form, files, d.stock);
        created++;
        result = failed || !complete ? { tone: "warning", text: "Created, but some images or stock didn't save" } : { tone: "success", text: "Created" };
      } catch (e) {
        result = { tone: "danger", text: e instanceof ApiError ? e.message : "Failed" };
      }
      setResults((r) => ({ ...r, [i]: result }));
    }
    toast.success(`${created} of ${drafts.length} products created.`);
    setRunning(false);
  }

  return (
    <>
      <PageHeader
        back={
          <Link href="/products" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
            <ArrowLeft className="size-4" /> Products
          </Link>
        }
        title="Import products"
        description="Upload a JSON file with one product or a list of products. Each gets its images and stock."
        actions={
          <>
            <label className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-cream-300 bg-white px-4 text-sm font-semibold hover:bg-cream-100", running && "pointer-events-none opacity-50")}>
              <Upload className="size-4" /> {fileName ? "Choose another file" : "Choose JSON file"}
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />
            </label>
            {drafts.length > 0 && done < drafts.length && (
              <Button onClick={run} loading={running}>
                {running ? `Importing ${done + 1} of ${drafts.length}…` : `Import ${drafts.length} product${drafts.length > 1 ? "s" : ""}`}
              </Button>
            )}
            {!running && done > 0 && done === drafts.length && <LinkButton href="/products">Done</LinkButton>}
          </>
        }
      />

      <Card>
        <CardHeader title={fileName || "No file chosen"} description={drafts.length ? "Check the products below, then import." : "Pick a .json file to preview it here."} />
        {drafts.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>SKU</Th>
                <Th>Price</Th>
                <Th>Colours</Th>
                <Th>Sizes</Th>
                <Th>Stock</Th>
                <Th>Images</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => (
                <tr key={i}>
                  <Td className="font-semibold">{d.form.name || <span className="text-danger-500">Missing name</span>}</Td>
                  <Td>{d.form.sku || <span className="text-danger-500">Missing</span>}</Td>
                  <Td className="tabular-nums">₹{d.form.price || "—"}</Td>
                  <Td>{d.form.colors.join(", ") || <span className="text-danger-500">None</span>}</Td>
                  <Td>{d.form.sizes.join(", ") || "—"}</Td>
                  <Td className="tabular-nums">{Object.values(d.stock).reduce((a, b) => a + b, 0)}</Td>
                  <Td>{d.images.length}</Td>
                  <Td>{results[i] ? <Badge tone={results[i].tone} dot>{results[i].text}</Badge> : <span className="text-ink-500">Pending</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
