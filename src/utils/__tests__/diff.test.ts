import { describe, it, expect } from "vitest";
import { diffLines, diffToRows, diffToText } from "@/utils/diff";

describe("diffLines", () => {
  it("两个相同文本全部 equal", () => {
    const parts = diffLines("a\nb\nc", "a\nb\nc");
    expect(parts.every((p) => p.op === "equal")).toBe(true);
    expect(parts).toHaveLength(3);
  });

  it("识别新增行", () => {
    const parts = diffLines("a\nc", "a\nb\nc");
    expect(parts.find((p) => p.op === "add")?.b).toBe("b");
    expect(parts.filter((p) => p.op === "add")).toHaveLength(1);
  });

  it("识别删除行", () => {
    const parts = diffLines("a\nb\nc", "a\nc");
    expect(parts.find((p) => p.op === "remove")?.a).toBe("b");
    expect(parts.filter((p) => p.op === "remove")).toHaveLength(1);
  });

  it("空文本对比", () => {
    expect(diffLines("", "")).toHaveLength(0);
    expect(diffLines("", "x")).toEqual([{ op: "add", b: "x" }]);
  });
});

describe("diffToRows", () => {
  it("删除与新增配对成同一行", () => {
    const rows = diffToRows(diffLines("a\nb", "a\nc"));
    const changed = rows.find((r) => r.a?.type === "remove" && r.b?.type === "add");
    expect(changed?.a?.text).toBe("b");
    expect(changed?.b?.text).toBe("c");
  });
});

describe("diffToText", () => {
  it("输出带 +/- 前缀的文本", () => {
    const text = diffToText(diffLines("a\nb", "a\nc"));
    expect(text).toContain(" a"); // equal 行带空格前缀
    expect(text).toContain("-b");
    expect(text).toContain("+c");
  });
});
