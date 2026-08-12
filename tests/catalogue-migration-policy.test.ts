import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("catalogue migration safety", () => {
  it("uses one atomic temp mapping with cardinality and update guards", () => {
    const sql = readFileSync("supabase/migrations/202608120002_catalogue_mapping.sql", "utf8");
    expect(sql).toContain("create temp table catalogue_mapping"); expect(sql).toContain("insert into catalogue_mapping values"); expect(sql).toContain("HK-001','礦泉水"); expect(sql).toContain("HK-014',null,null,'維他奶"); expect(sql).toContain("HK-057','戒指糖");
    expect(sql).toContain("mapped_count<>57");
    expect(sql).toContain("distinct_count<>57");
    expect(sql).toContain("existing_count=0");
    expect(sql).toContain("existing_count<>57");
    expect(sql).toContain("updated_count<>57");
    expect(sql.match(/insert\s+into\s+catalogue_mapping/gi) ?? []).toHaveLength(1);
  });
});
