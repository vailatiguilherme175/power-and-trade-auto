import { readFile, writeFile } from "node:fs/promises";

const drafts = JSON.parse(await readFile("data/drafts.json", "utf8"));
const posts = JSON.parse(await readFile("data/posts.json", "utf8"));
const approved = drafts.filter((draft) => draft.status === "approved");
const remaining = drafts.filter((draft) => draft.status !== "approved");

const published = approved.map((draft) => ({
  ...draft,
  status: "published",
  publishedAt: draft.publishedAt || new Date().toISOString(),
  editorialChecks: {
    ...(draft.editorialChecks || {}),
    approvedByHuman: true,
    canPublishAutomatically: false
  }
}));

const nextPosts = [...published, ...posts];
await writeFile("data/posts.json", `${JSON.stringify(nextPosts, null, 2)}\n`, "utf8");
await writeFile("data/drafts.json", `${JSON.stringify(remaining, null, 2)}\n`, "utf8");

console.log(`${published.length} rascunho(s) aprovado(s) publicado(s).`);
