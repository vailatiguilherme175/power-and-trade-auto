# Power & Trade Auto

Portal editorial automático para Power & Trade.

## O que está pronto

- Site público em `index.html`, lendo `data/posts.json`.
- Painel admin em `admin.html`, lendo `data/drafts.json` e `data/posts.json`.
- Função segura de publicação em `netlify/functions/publish.js`.
- Script diário para buscar fontes RSS e gerar rascunhos: `npm run fetch:news`.
- Validação editorial: `npm run validate`.
- Publicação de rascunhos aprovados: `npm run publish:approved`.
- Servidor local para testar JSON/fetch: `npm run serve`.
- Workflow GitHub Actions em `.github/workflows/daily-news.yml`.

## Regra editorial

A automação nunca deve publicar sozinha.

Ela gera rascunhos com:

- fonte original;
- link;
- categoria;
- resumo inicial;
- checagens editoriais;
- status `draft`;
- `canPublishAutomatically: false`.

Você revisa, ajusta e prepara a publicação. O item só entra no site público quando `data/posts.json` e `data/drafts.json` forem salvos no GitHub e o Netlify fizer o deploy.

O botão `Publicar no GitHub/Netlify` faz isso automaticamente somente se a função segura estiver configurada no Netlify com as variáveis abaixo. Sem essas variáveis, o painel não publica e mostra aviso.

## Configurar publicação real pelo admin

No Netlify, abra o projeto e vá em `Project configuration` > `Environment variables`. Crie:

- `ADMIN_SECRET`: uma senha forte para publicar pelo admin.
- `GITHUB_TOKEN`: token do GitHub com permissão de `Contents: Read and write` no repositório `power-and-trade-auto`.
- `GITHUB_OWNER`: `vailatiguilherme175` (opcional, já é o padrão).
- `GITHUB_REPO`: `power-and-trade-auto` (opcional, já é o padrão).
- `GITHUB_BRANCH`: `main` (opcional, já é o padrão).

Depois faça um novo deploy no Netlify. A partir daí, no `admin.html`, o fluxo correto é:

1. Criar ou revisar rascunho.
2. Clicar em `Preparar publicação`.
3. Clicar em `Publicar no GitHub/Netlify`.
4. Digitar a senha definida em `ADMIN_SECRET`.
5. Aguardar o commit no GitHub e o deploy do Netlify.

## Rotina diária com o ChatGPT

1. Peça o briefing diário no ChatGPT usando o prompt editorial de geopolítica, conflitos, comércio, energia, commodities, risco-país e Brasil no cenário global.
2. Abra `admin.html`.
3. Para cada notícia boa, crie um rascunho com título, fonte, link, resumo, impacto para Brasil/negócios/mercados e ângulo editorial.
4. Prepare para publicação apenas rascunhos com fonte verificável e análise suficiente.
5. Clique em `Publicar no GitHub/Netlify`. Se a função segura ainda não estiver configurada, baixe `posts.json` e `drafts.json`, substitua os arquivos dentro de `data/` e envie para o GitHub.

O objetivo é manter a IA ajudando na triagem, mas preservar revisão humana antes da publicação.

## Rodar localmente

```bash
npm run serve
```

Abrir:

- Site: `http://localhost:4173`
- Admin: `http://localhost:4173/admin.html`

## Gerar rascunhos automaticamente

```bash
npm run fetch:news
npm run validate
```

Se rodar em ambiente sem internet, a coleta pode retornar `fetch failed`. Em GitHub Actions, Vercel Cron, Cloudflare Workers ou servidor com internet liberada, os RSS devem funcionar.

## Publicar rascunhos aprovados

Edite `data/drafts.json` e troque `status` para `approved`, depois rode:

```bash
npm run publish:approved
npm run validate
```

O script move os aprovados para `data/posts.json`.

## Caminho para produção

1. Subir esta pasta para GitHub.
2. Publicar em Vercel, Cloudflare Pages ou Netlify.
3. Ativar o workflow diário.
4. Revisar rascunhos no admin.
5. Publicar apenas conteúdos com fonte verificável.

## Próxima evolução

Para automação completa com login e gravação direta no banco:

- Supabase Auth;
- tabela `posts`;
- tabela `drafts`;
- tabela `sources`;
- cron server-side;
- API de geração de texto com chave própria;
- botão `Publicar` persistindo no banco.
