# Power & Trade

Portal editorial publicado pelo Netlify e administrado com o Decap CMS.

## Publicação pelo painel

O painel oficial fica em `/admin/`. O fluxo editorial é:

1. Entrar no painel.
2. Criar um artigo.
3. Preencher título, texto, fonte, link e imagem.
4. Clicar em `Publicar`.
5. O Decap CMS grava o artigo em `content/posts/` no GitHub.
6. O Netlify executa `npm run build` e atualiza o site automaticamente.

Não existe botão personalizado, download de JSON ou arquivo ZIP nesse fluxo.

## Ativação única no Netlify

No projeto `power-and-trade-br`:

1. Ative o Netlify Identity.
2. Defina o cadastro como `Invite only`.
3. Ative o serviço Git Gateway.
4. Convide o e-mail do administrador.
5. Aceite o convite recebido por e-mail e defina a senha.

Depois, abra `https://power-and-trade-br.netlify.app/admin/`.

## Estrutura

- `admin/index.html`: aplicação oficial do Decap CMS.
- `admin/config.yml`: backend Git Gateway e campos editoriais.
- `content/posts/`: artigos criados pelo painel.
- `media/uploads/`: imagens enviadas pelo painel.
- `scripts/build-content.mjs`: incorpora os artigos do CMS em `data/posts.json`.
- `index.html`: portal público.

## Desenvolvimento local

```bash
npm run build
npm run serve
```

O painel local exige o proxy oficial do Decap ou o login configurado no Netlify. O fluxo principal de edição deve ser testado no endereço publicado.

## Regra editorial

Publique somente conteúdo revisado, com fonte verificável e imagem real com direito de uso. A automação de coleta pode gerar rascunhos, mas a decisão de publicar continua humana.
