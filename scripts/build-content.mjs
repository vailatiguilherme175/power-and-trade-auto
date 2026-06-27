import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const postsFile = path.join(root, "data", "posts.json");
const contentDir = path.join(root, "content", "posts");

const legacyPosts = JSON.parse(await readFile(postsFile, "utf8"));
const files = (await readdir(contentDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name);

const cmsPosts = [];
for (const filename of files) {
  const raw = JSON.parse(await readFile(path.join(contentDir, filename), "utf8"));
  cmsPosts.push(normalizePost(raw, path.basename(filename, ".json")));
}

const merged = new Map();
for (const post of legacyPosts) merged.set(post.id, post);
for (const post of cmsPosts) merged.set(post.id, post);

const posts = [...merged.values()]
  .filter((post) => post.status === "published")
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

await writeFile(postsFile, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
console.log(`Power & Trade: ${cmsPosts.length} artigo(s) do Decap CMS; ${posts.length} artigo(s) no site.`);

function normalizePost(post, filename) {
  const body = Array.isArray(post.body)
    ? post.body
    : String(post.body || "").split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return {
    id: post.id || filename,
    status: "published",
    category: post.category || "Geopolítica",
    topic: post.topic || "Global",
    publishedAt: post.publishedAt || new Date().toISOString(),
    sourceName: post.sourceName || "Fonte não informada",
    sourceUrl: post.sourceUrl || "",
    image: post.image || "",
    title: post.title || "Sem título",
    summary: post.summary || body[0] || "",
    body,
    angles: {
      pro: post.pro || "",
      critical: post.critical || "",
      watch: post.watch || ""
    },
    editorialChecks: { approvedByHuman: true, publishedWithDecapCms: true }
  };
}
