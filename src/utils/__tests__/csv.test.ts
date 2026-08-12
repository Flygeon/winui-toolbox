import { describe, it, expect } from "vitest";
import { parseCsv, toCsv, parseMdTable, toMdTable } from "@/utils/csv";

describe("parseCsv", () => {
  it("解析简单 CSV", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("处理带引号的字段（含逗号、换行、转义引号）", () => {
    const csv = 'a,"b,c",d\n"line1\nline2","he said ""hi""",x';
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(["a", "b,c", "d"]);
    expect(rows[1]).toEqual(["line1\nline2", 'he said "hi"', "x"]);
  });

  it("处理 CRLF 与尾部空行", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("自定义分隔符", () => {
    expect(parseCsv("a;b;c", ";")).toEqual([["a", "b", "c"]]);
  });
});

describe("toCsv", () => {
  it("序列化并转义", () => {
    expect(toCsv([["a", "b,c", 'x"y']], ",")).toBe('a,"b,c","x""y"');
  });

  it("round-trip 一致", () => {
    const rows = [
      ["名称", "描述"],
      ["工具", '含"引号"与,逗号'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe("Markdown 表格", () => {
  const md = "| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |";

  it("解析 Markdown 表格（忽略分隔行）", () => {
    expect(parseMdTable(md)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("生成 Markdown 表格并可 round-trip", () => {
    const rows = [
      ["a", "b"],
      ["1", "2"],
    ];
    expect(parseMdTable(toMdTable(rows))).toEqual(rows);
  });
});
