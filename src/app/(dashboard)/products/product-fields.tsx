"use client";
import { useState } from "react";
import { buildProductDisplayName } from "@/lib/product-display-name";

export function ProductFields({ initial = {}, disabled = false }: { initial?: Record<string, string | null | undefined>; disabled?: boolean }) {
  const [values, setValues] = useState({ brand: initial.brand ?? "", nameZh: initial.nameZh ?? "", nameEn: initial.nameEn ?? "", size: initial.size ?? "", packageType: initial.packageType ?? "", flavour: initial.flavour ?? "" });
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const preview = buildProductDisplayName({ brand: values.brand, name_zh: values.nameZh, name_en: values.nameEn, size: values.size, package_type: values.packageType, flavour: values.flavour });
  return <>
    {([['brand','Brand'],['nameZh','Chinese name'],['nameEn','English name'],['size','Size'],['packageType','Package type'],['flavour','Flavour']] as const).map(([key,label]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input name={key} value={values[key]} onChange={set(key)} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>)}
    <p className="text-sm text-slate-500 sm:col-span-2">Display preview: <strong>{preview || "—"}</strong></p>
  </>;
}
