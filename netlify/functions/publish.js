const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { message: "Use POST." });
  }

  const token = process.env.GITHUB_TOKEN;
  const adminSecret = process.env.ADMIN_SECRET;
  const owner = process.env.GITHUB_OWNER || "vailatiguilherme175";
  const repo = process.env.GITHUB_REPO || "power-and-trade-auto";
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !adminSecret) {
    return response(501, {
      message: "Publicação real ainda não configurada. No Netlify, crie as variáveis GITHUB_TOKEN e ADMIN_SECRET."
    });
  }

  if (event.headers["x-admin-secret"] !== adminSecret) {
    return response(401, { message: "Senha de publicação inválida." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { message: "JSON inválido." });
  }

  const posts = normalizePosts(payload.posts);
  const drafts = normalizeDrafts(payload.drafts);
  const validationError = validatePayload(posts, drafts);
  if (validationError) {
    return response(422, { message: validationError });
  }

  try {
    const commit = await commitFiles({
      token,
      owner,
      repo,
      branch,
      files: {
        "data/posts.json": `${JSON.stringify(posts, null, 2)}\n`,
        "data/drafts.json": `${JSON.stringify(drafts, null, 2)}\n`
      }
    });

    return response(200, {
      message: "Publicado no GitHub. O Netlify deve iniciar um deploy em seguida.",
      commit,
      posts,
      drafts
    });
  } catch (error) {
    return response(500, {
      message: `Falha ao gravar no GitHub: ${error.message || "erro desconhecido"}`
    });
  }
};

function normalizePosts(posts) {
  const now = new Date().toISOString();
  return Array.isArray(posts)
    ? posts.map((post) => {
        const { publishState, ...cleanPost } = post || {};
        return {
          ...cleanPost,
          status: "published",
          publishedAt: cleanPost.publishedAt || now,
          editorialChecks: {
            ...(cleanPost.editorialChecks || {}),
            approvedByHuman: true,
            canPublishAutomatically: false
          }
        };
      })
    : [];
}

function normalizeDrafts(drafts) {
  return Array.isArray(drafts) ? drafts : [];
}

function validatePayload(posts, drafts) {
  const required = ["id", "status", "category", "sourceName", "sourceUrl", "title", "summary", "body"];
  for (const [collection, items] of [["post", posts], ["draft", drafts]]) {
    for (const item of items) {
      for (const field of required) {
        if (!item?.[field] || (Array.isArray(item[field]) && item[field].length === 0)) {
          return `${collection} sem campo obrigatório: ${field}`;
        }
      }
      if (!/^https?:\/\//.test(item.sourceUrl || "")) {
        return `${collection} com fonte inválida: ${item.title || item.id || "sem título"}`;
      }
    }
  }
  return "";
}

async function commitFiles({ token, owner, repo, branch, files }) {
  const api = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "user-agent": "power-and-trade-admin"
  };

  const ref = await github(`${api}/git/ref/heads/${branch}`, { headers });
  const baseCommit = await github(`${api}/git/commits/${ref.object.sha}`, { headers });

  const treeItems = [];
  for (const [path, content] of Object.entries(files)) {
    const blob = await github(`${api}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: Buffer.from(content, "utf8").toString("base64"),
        encoding: "base64"
      })
    });

    treeItems.push({
      path,
      mode: "100644",
      type: "blob",
      sha: blob.sha
    });
  }

  const tree = await github(`${api}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: treeItems
    })
  });

  const commit = await github(`${api}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: "Publish Power & Trade editorial updates",
      tree: tree.sha,
      parents: [baseCommit.sha]
    })
  });

  await github(`${api}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      sha: commit.sha,
      force: false
    })
  });

  return commit.sha;
}

async function github(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || `GitHub HTTP ${res.status}`);
  }
  return body;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body)
  };
}
