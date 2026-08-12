import { describe, expect, it } from "vitest";

import { buildProductDisplayName } from "../src/lib/product-display-name";

describe("buildProductDisplayName", () => {
  it("joins brand, size, package and flavour without duplicate separators", () => {
    expect(buildProductDisplayName({ brand: "旺仔", name_zh: "QQ糖", size: "", package_type: "", flavour: "藍莓" })).toBe("旺仔 QQ糖｜藍莓味");
    expect(buildProductDisplayName({ brand: "維他奶", name_zh: "", size: "250ml" })).toBe("維他奶 250ml");
  });

  it("keeps non-味 suffixes and tolerates empty fields", () => {
    expect(buildProductDisplayName({ name_zh: "抽紙", package_type: "袋裝", flavour: "綠茶香" })).toBe("抽紙｜袋裝｜綠茶香");
    expect(buildProductDisplayName({ brand: "  卡樂B｜", name_zh: "薯片", flavour: "燒烤味" })).toBe("卡樂B 薯片｜燒烤味");
  });
});
