/**
 * 行级差异比对（基于 LCS 动态规划），无第三方依赖。
 */

export type DiffOp = "equal" | "add" | "remove";

export interface DiffPart {
  op: DiffOp;
  a?: string;
  b?: string;
}

export interface DiffRow {
  a: { text: string; type: "equal" | "remove" } | null;
  b: { text: string; type: "equal" | "add" } | null;
}

function splitLines(s: string): string[] {
  if (s === "") return [];
  return s.replace(/\r\n/g, "\n").split("\n");
}

/** 计算 A→B 的行级操作序列（equal / add / remove） */
export function diffLines(a: string, b: string): DiffPart[] {
  const A = splitLines(a);
  const B = splitLines(b);
  const n = A.length;
  const m = B.length;

  // LCS DP（从末尾向前，便于回溯）
  const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      parts.push({ op: "equal", a: A[i], b: B[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      parts.push({ op: "remove", a: A[i] });
      i++;
    } else {
      parts.push({ op: "add", b: B[j] });
      j++;
    }
  }
  while (i < n) {
    parts.push({ op: "remove", a: A[i] });
    i++;
  }
  while (j < m) {
    parts.push({ op: "add", b: B[j] });
    j++;
  }
  return parts;
}

/** 将操作序列转换为左右对齐的行（删除与新增配对成同一行） */
export function diffToRows(parts: DiffPart[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let i = 0;
  while (i < parts.length) {
    const p = parts[i];
    if (p.op === "equal") {
      rows.push({ a: { text: p.a ?? "", type: "equal" }, b: { text: p.b ?? "", type: "equal" } });
      i++;
      continue;
    }
    if (p.op === "remove") {
      const removes: string[] = [];
      while (i < parts.length && parts[i].op === "remove") {
        removes.push(parts[i].a ?? "");
        i++;
      }
      const adds: string[] = [];
      while (i < parts.length && parts[i].op === "add") {
        adds.push(parts[i].b ?? "");
        i++;
      }
      const n = Math.max(removes.length, adds.length);
      for (let k = 0; k < n; k++) {
        rows.push({
          a: k < removes.length ? { text: removes[k], type: "remove" } : null,
          b: k < adds.length ? { text: adds[k], type: "add" } : null,
        });
      }
      continue;
    }
    // 单独的 add（无前置 remove）
    const adds: string[] = [];
    while (i < parts.length && parts[i].op === "add") {
      adds.push(parts[i].b ?? "");
      i++;
    }
    for (const x of adds) rows.push({ a: null, b: { text: x, type: "add" } });
  }
  return rows;
}

/** 生成文本版差异（类 unified：- 删除行 / + 新增行） */
export function diffToText(parts: DiffPart[]): string {
  const out: string[] = [];
  for (const p of parts) {
    if (p.op === "equal") out.push(` ${p.a}`);
    else if (p.op === "remove") out.push(`-${p.a}`);
    else out.push(`+${p.b}`);
  }
  return out.join("\n");
}
