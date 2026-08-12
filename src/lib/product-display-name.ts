export type ProductDisplayParts = {
  brand?: string | null;
  name_zh?: string | null;
  name_en?: string | null;
  flavour?: string | null;
  size?: string | null;
  package_type?: string | null;
};

const clean = (value: unknown) => String(value ?? "").trim().replace(/[|｜]+$/u, "");

/** Build the compact catalogue label from structured fields. */
export function buildProductDisplayName(parts: ProductDisplayParts): string {
  const brand = clean(parts.brand);
  const zh = clean(parts.name_zh);
  const en = clean(parts.name_en);
  const core = [brand, zh || en].filter(Boolean).join(" ");
  const label = [core, clean(parts.size)].filter(Boolean).join(" ");
  const flavour = clean(parts.flavour);
  const flavourLabel = flavour
    ? flavour.endsWith("味") || flavour.endsWith("香") ? flavour : `${flavour}味`
    : "";
  return [label, clean(parts.package_type), flavourLabel].filter(Boolean).join("｜");
}
