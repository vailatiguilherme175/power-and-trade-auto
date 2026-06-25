import { readFile } from "node:fs/promises";

const requiredFields = ["id", "status", "category", "sourceName", "sourceUrl", "title", "summary", "body"];
const drafts = JSON.parse(await readFile("data/drafts.json", "utf8"));
const posts = JSON.parse(await readFile("data/posts.json", "utf8"));
const all = [...drafts, ...posts];
const errors = [];

for (const item of all) {
  for (const field of requiredFields) {
    if (!item[field] || (Array.isArray(item[field]) && item[field].length === 0)) {
      errors.push(`${item.id || "sem-id"}: campo obrigatório ausente: ${field}`);
    }
  }
  if (item.status === "published" && !item.publishedAt) {
    errors.push(`${item.id}: publicado sem publishedAt`);
  }
  if (!/^https?:\/\//.test(item.sourceUrl || "")) {
    errors.push(`${item.id}: sourceUrl inválida`);
  }
  if (item.status === "draft" && item.editorialChecks?.canPublishAutomatically !== false) {
    errors.push(`${item.id}: rascunho automático deve bloquear publicação automática`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validação OK: ${all.length} item(ns) verificado(s).`);
