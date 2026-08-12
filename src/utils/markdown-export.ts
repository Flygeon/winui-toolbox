import { marked } from "marked";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";

/** Markdown → HTML（GFM，用于实时预览与打印导出） */
export function markdownToHtml(md: string): string {
  return marked.parse(md, { gfm: true, breaks: true }) as string;
}

/** 宽松的内联 token 结构（避免 marked 泛型带来的类型噪音） */
interface InlineToken {
  type: string;
  text: string;
  href?: string;
}

interface AnyBlock {
  type: string;
  text?: string;
  depth?: number;
  lang?: string;
  tokens?: unknown[];
  items?: { text: string; tokens?: unknown[] }[];
  ordered?: boolean;
  header?: { text: string; tokens?: unknown[] }[];
  rows?: { text: string; tokens?: unknown[] }[][];
}

/** 内联 token → docx TextRun[] */
function inlineRuns(tokens: unknown[] | undefined, fallback: string): TextRun[] {
  const arr = (Array.isArray(tokens) && tokens.length ? tokens : [{ type: "text", text: fallback }]) as InlineToken[];
  const runs: TextRun[] = [];
  for (const t of arr) {
    const text = t.text ?? "";
    switch (t.type) {
      case "strong":
        runs.push(new TextRun({ text, bold: true }));
        break;
      case "em":
        runs.push(new TextRun({ text, italics: true }));
        break;
      case "del":
        runs.push(new TextRun({ text, strike: true }));
        break;
      case "codespan":
        runs.push(new TextRun({ text, font: "Consolas", size: 18 }));
        break;
      case "link":
        runs.push(new TextRun({ text, color: "0563C1", underline: {} }));
        break;
      case "br":
        runs.push(new TextRun({ break: 1 }));
        break;
      default:
        runs.push(new TextRun({ text }));
    }
  }
  return runs;
}

/** 代码块 → 带底纹的等宽段落（内部用 break 保持换行） */
function codeParagraph(text: string): Paragraph {
  const lines = text.split("\n");
  const children: TextRun[] = [];
  lines.forEach((line, i) => {
    children.push(new TextRun({ text: line, font: "Consolas", size: 18 }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });
  return new Paragraph({
    children,
    spacing: { before: 80, after: 160 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" },
  });
}

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

/** 块级 token → docx 元素数组 */
function blockToDocx(token: AnyBlock): (Paragraph | Table | undefined)[] {
  switch (token.type) {
    case "space":
    case "html":
      return [];
    case "heading":
      return [
        new Paragraph({
          heading: HEADING_LEVELS[Math.min(token.depth ?? 1, 6) - 1],
          spacing: { before: 240, after: 120 },
          children: inlineRuns(token.tokens, token.text ?? ""),
        }),
      ];
    case "paragraph":
      return [new Paragraph({ spacing: { after: 160 }, children: inlineRuns(token.tokens, token.text ?? "") })];
    case "blockquote":
      return [
        new Paragraph({
          children: inlineRuns(token.tokens, token.text ?? ""),
          indent: { left: 360 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: "C8C8C8" } },
          spacing: { after: 160 },
        }),
      ];
    case "code":
      return [codeParagraph(token.text ?? "")];
    case "hr":
      return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } }, spacing: { after: 160 } })];
    case "list": {
      const items = token.items ?? [];
      return items.map((item, i) => {
        const runs = inlineRuns(item.tokens, item.text);
        const prefix = token.ordered ? `${i + 1}. ` : "";
        const children = prefix ? [new TextRun({ text: prefix }), ...runs] : runs;
        return new Paragraph({
          children,
          bullet: token.ordered ? undefined : { level: 0 },
          spacing: { after: 80 },
        });
      });
    }
    case "table": {
      const rows = [(token.header ?? []), ...(token.rows ?? [])].map((r, ri) =>
        new TableRow({
          tableHeader: ri === 0,
          children: r.map((c) =>
            new TableCell({
              children: [new Paragraph({ children: inlineRuns(c.tokens, c.text), spacing: { after: 0 } })],
              borders: { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER },
            })
          ),
        })
      );
      return [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })];
    }
    default:
      return [new Paragraph({ children: inlineRuns(token.tokens, token.text ?? "") })];
  }
}

/** Markdown → .docx Blob */
export async function markdownToDocxBlob(md: string): Promise<Blob> {
  const tokens = marked.lexer(md, { gfm: true }) as unknown as AnyBlock[];
  const children = tokens.flatMap((t) => blockToDocx(t)).filter((x): x is Paragraph | Table => x !== undefined);
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Microsoft YaHei" } },
      },
    },
    sections: [{ children }],
  });
  return await Packer.toBlob(doc);
}

/** 打印为 PDF：用隐藏 iframe 渲染 HTML 后调用系统打印（可另存为 PDF，中文字体无缺字） */
export function printHtmlToPdf(html: string, title: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.title = title;
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  const style = [
    "body{font-family:'Segoe UI','Microsoft YaHei',sans-serif;padding:2.5em 3em;line-height:1.7;color:#1a1a1a}",
    "h1,h2,h3,h4{color:#0067c0}",
    "code,pre{background:#f3f3f3;border-radius:4px;padding:2px 5px;font-family:Consolas,monospace;font-size:13px}",
    "pre{padding:10px 14px;overflow:auto}",
    "blockquote{border-left:4px solid #ddd;margin:0;padding-left:1em;color:#555}",
    "table{border-collapse:collapse}",
    "th,td{border:1px solid #ccc;padding:6px 10px}",
    "img{max-width:100%}",
  ].join("");
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/[<>&"]/g, "")}</title><style>${style}</style></head><body>${html}</body></html>`
  );
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 3000);
  }, 80);
}
