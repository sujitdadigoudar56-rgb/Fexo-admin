"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/hooks";
import type { Product } from "@/lib/types";
import { ProductEditor } from "@/components/product-editor";
import { ErrorBlock, LoadingBlock } from "@/components/ui/data";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload, setData } = useResource<Product>(`/products/${id}/`);

  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (loading && !data) return <LoadingBlock />;
  if (!data) return null;
  return <ProductEditor product={data} onSaved={setData} />;
}
