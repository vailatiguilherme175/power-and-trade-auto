# Power & Trade Auto

Portal editorial automático para Power & Trade.

## O que está pronto

- Site público em `index.html`, lendo `data/posts.json`.
- Painel admin em `admin.html`, lendo `data/drafts.json` e `data/posts.json`.
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

Você revisa, ajusta e aprova. Só então o item pode virar post publicado.

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
