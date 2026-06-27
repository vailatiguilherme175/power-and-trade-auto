import { Buffer } from "node:buffer";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return response(405, { message: "Use POST." });

  const token = process.env.GITHUB_TOKEN;
  const adminSecret = process.env.ADMIN_SECRET;
  const owner = process.env.GITHUB_OWNER || "vailatiguilherme175";
  const repo = process.env.GITHUB_REPO || "power-and-trade-auto";
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !adminSecret) {
    return response(501, { message: "Backend incompleto: configure GITHUB_TOKEN e ADMIN_SECRET no Netlify." });
  }
  if (event.headers["x-admin-secret"] !== adminSecret) {
    return response(401, { message: "Senha administrativa incorreta." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { message: "Dados inválidos." });
  }

  const article = normalizeArticle(payload.article);
  const validationError = validateArticle(article);
  if (validationError) return response(422, { message: validationError });

  try {
    const api = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = githubHeaders(token);
    const currentPosts = await readJsonFile(`${api}/contents/data/posts.json?ref=${encodeURIComponent(branch)}`, headers);
    const posts = [article, ...currentPosts.filter((post) => post.id !== article.id)];
    const commit = await commitFiles({
      api,
      headers,
      branch,
      files: { "data/posts.json": `${JSON.stringify(posts, null, 2)}\n` }
    });

    return response(200, {
      message: "Artigo gravado. O deploy foi iniciado.",
      commit,
      articleId: article.id
    });
  } catch (error) {
    return response(500, { message: `Falha ao publicar: ${error.message || "erro desconhecido"}` });
  }
};

function normalizeArticle(input = {}) {
  const now = new Date().toISOString();
  const title = String(input.title || "").trim();
  const text = String(input.text || "").trim();
  const body = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const summary = String(input.summary || body[0] || "").trim().slice(0, 420);
  return {
    id: `${slugify(title)}-${now.slice(0, 10)}-${Date.now().toString(36)}`,
    status: "published",
    category: String(input.category || "Geopolítica").trim(),
    topic: String(input.topic || "Global").trim(),
    publishedAt: now,
    sourceName: String(input.sourceName || "").trim(),
    sourceUrl: String(input.sourceUrl || "").trim(),
    image: String(input.image || "").trim(),
    title,
    summary,
    body,
    angles: {
      pro: String(input.pro || "Possíveis oportunidades e efeitos favoráveis devem ser avaliados conforme os dados evoluem.").trim(),
      critical: String(input.critical || "Os riscos e as versões divergentes precisam continuar sob verificação editorial.").trim(),
      watch: String(input.watch || "Acompanhar novas informações da fonte original e seus impactos para o Brasil.").trim()
    },
    editorialChecks: {
      approvedByHuman: true,
      hasSource: true,
      publishedFromAdmin: true
    }
  };
}

function validateArticle(article) {
  if (article.title.length < 12) return "Informe um título mais completo.";
  if (article.body.join(" ").length < 180) return "O texto precisa ter pelo menos 180 caracteres.";
  if (!article.sourceName) return "Informe o nome da fonte.";
  if (!isHttpUrl(article.sourceUrl)) return "Informe um link válido para a fonte.";
  if (!isHttpUrl(article.image)) return "Informe uma URL válida para a imagem.";
  return "";
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "artigo";
}

function githubHeaders(token) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "user-agent": "power-and-trade-admin",
    "x-github-api-version": "2022-11-28"
  };
}

async function readJsonFile(url, headers) {
  const file = await github(url, { headers });
  const content = Buffer.from(String(file.content || "").replace(/\n/g, ""), "base64").toString("utf8");
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [];
}

async function commitFiles({ api, headers, branch, files }) {
  const ref = await github(`${api}/git/ref/heads/${branch}`, { headers });
  const baseCommit = await github(`${api}/git/commits/${ref.object.sha}`, { headers });
  const treeItems = [];

  for (const [path, content] of Object.entries(files)) {
    const blob = await github(`${api}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: Buffer.from(content, "utf8").toString("base64"), encoding: "base64" })
    });
    treeItems.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const tree = await github(`${api}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeItems })
  });
  const commit = await github(`${api}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: "Publicar artigo pelo painel Power & Trade", tree: tree.sha, parents: [baseCommit.sha] })
  });
  await github(`${api}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ sha: commit.sha, force: false })
  });
  return commit.sha;
}

async function github(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `GitHub HTTP ${res.status}`);
  return body;
}

function response(statusCode, body) {
  return { statusCode, headers: jsonHeaders, body: JSON.stringify(body) };
}
