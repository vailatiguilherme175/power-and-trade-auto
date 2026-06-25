import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const dataDir = path.join(root, "data");
const sourcesPath = path.join(dataDir, "sources.json");
const draftsPath = path.join(dataDir, "drafts.json");
const logPath = path.join(dataDir, "editorial-log.json");

const categoryImages = {
  "Energia": "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=1600&q=82",
  "Comércio": "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&w=1600&q=82",
  "Risco-País": "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=1600&q=82",
  "América Latina": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1600&q=82",
  "Brasil Global": "https://images.unsplash.com/photo-1541872705-1f73c6400ec9?auto=format&fit=crop&w=1600&q=82"
};

const readJson = async (file, fallback) => {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await readFile(file, "utf8"));
};

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const getTag = (item, tag) => {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return stripHtml(match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""));
};

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 78);

const splitGoogleTitle = (title) => {
  const parts = title.split(" - ");
  if (parts.length < 2) return { cleanTitle: title, sourceName: "Fonte RSS" };
  return { cleanTitle: parts.slice(0, -1).join(" - "), sourceName: parts.at(-1) };
};

const buildDraft = ({ title, description, link, pubDate, category, sourceName }) => {
  const today = new Date().toISOString().slice(0, 10);
  const id = `${slugify(title)}-${today}`;
  const summary = description || "Rascunho gerado a partir de fonte externa. Revisar contexto, impacto e fonte antes de publicar.";
  return {
    id,
    status: "draft",
    category,
    topic: category,
    generatedAt: new Date().toISOString(),
    publishedAt: "",
    sourceName,
    sourceUrl: link,
    image: categoryImages[category] || categoryImages["Brasil Global"],
    title,
    summary,
    body: [
      `Fato verificado na fonte indicada: ${title}.`,
      `Contexto inicial: ${summary}`,
      "Análise preliminar Power & Trade: revisar impacto para Brasil, empresas, comércio, energia, câmbio e risco regulatório antes de publicar."
    ],
    angles: {
      pro: "Preencher visão favorável após leitura completa da fonte.",
      critical: "Preencher visão crítica após leitura completa da fonte.",
      watch: "Preencher indicadores e próximos eventos a monitorar."
    },
    editorialChecks: {
      hasSource: Boolean(link),
      needsHumanReview: true,
      canPublishAutomatically: false,
      note: "Rascunho automático. Não publicar sem revisão."
    }
  };
};

const sources = await readJson(sourcesPath, []);
const existingDrafts = await readJson(draftsPath, []);
const seen = new Set(existingDrafts.map((draft) => draft.sourceUrl || draft.id));
const newDrafts = [];

for (const source of sources) {
  try {
    const response = await fetch(source.rss, { headers: { "User-Agent": "PowerTradeBot/1.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 4);

    for (const [, rawItem] of items) {
      const rawTitle = getTag(rawItem, "title");
      const { cleanTitle, sourceName } = splitGoogleTitle(rawTitle);
      const link = getTag(rawItem, "link");
      if (!cleanTitle || !link || seen.has(link)) continue;

      const description = getTag(rawItem, "description");
      const pubDate = getTag(rawItem, "pubDate");
      const draft = buildDraft({
        title: cleanTitle,
        description,
        link,
        pubDate,
        category: source.category,
        sourceName
      });
      newDrafts.push(draft);
      seen.add(link);
    }
  } catch (error) {
    console.error(`Falha ao buscar ${source.name}: ${error.message}`);
  }
}

const drafts = [...newDrafts, ...existingDrafts].slice(0, 80);
await writeFile(draftsPath, `${JSON.stringify(drafts, null, 2)}\n`, "utf8");

const log = await readJson(logPath, []);
log.unshift({
  date: new Date().toISOString(),
  action: "fetch-news",
  note: `${newDrafts.length} rascunho(s) criado(s). Publicação automática permanece bloqueada.`
});
await writeFile(logPath, `${JSON.stringify(log.slice(0, 100), null, 2)}\n`, "utf8");

console.log(`Power & Trade: ${newDrafts.length} rascunho(s) gerado(s).`);
