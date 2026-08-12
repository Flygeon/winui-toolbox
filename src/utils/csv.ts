/** CSV / Markdown 表格 解析与序列化（纯逻辑，无 DOM 依赖，可单测） */

/** 解析 CSV（RFC 4180：支持引号、转义引号、字段内逗号与换行） */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/** 序列化单个 CSV 字段（含分隔符/引号/换行时加引号） */
export function escapeCsvField(value: string, delimiter = ","): string {
  if (/["\n\r]/.test(value) || value.includes(delimiter)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** 二维数组 → CSV 字符串 */
export function toCsv(rows: string[][], delimiter = ","): string {
  return rows.map((r) => r.map((c) => escapeCsvField(c, delimiter)).join(delimiter)).join("\n");
}

/** 解析 Markdown 表格（| a | b | 形式，忽略对齐分隔行） */
export function parseMdTable(text: string): string[][] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("|"));
  return lines
    .filter((l) => !/^\|[\s:|-]+\|$/.test(l))
    .map((l) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
}

/** 二维数组 → Markdown 表格字符串 */
export function toMdTable(rows: string[][]): string {
  if (!rows.length) return "";
  const colCount = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) =>
    Array.from({ length: colCount }, (_, i) => r[i] ?? "").map((c) => c.replace(/\|/g, "\\|"));
  const header = `| ${pad(rows[0]).join(" | ")} |`;
  const sep = `| ${Array.from({ length: colCount }, () => "---").join(" | ")} |`;
  const body = rows.slice(1).map((r) => `| ${pad(r).join(" | ")} |`);
  return [header, sep, ...body].join("\n");
}
