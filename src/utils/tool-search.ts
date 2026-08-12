import { allTools, type ToolDef } from "@/tools/registry";

/** 按标题 / 描述 / id 模糊搜索工具（主页与全局搜索共用） */
export function searchTools(query: string, limit = 12): ToolDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return allTools
    .filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.id.includes(q))
    .slice(0, limit);
}
