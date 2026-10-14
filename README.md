# Muvuca

Extensão Chrome (Manifest V3) numa mesh P2P pública. Quem estiver online troca packs de imagem e manda chat anônimo entre peers, sem servidor próprio.

## Troca de imagens

Substitui fotos das páginas pelo pack ativo. Dá pra criar packs locais (até 8 imagens, lado máximo 480px), ativar um deles e publicar na mesh para outros peers pedirem.

## Chat anônimo

Mensagens de até 280 caracteres para quem estiver na mesh agora. O nick nasce da sessão (`anon-xxxx`) e some ao fechar o Chrome. O histórico local guarda no máximo 50 mensagens; o rate limit é 4 mensagens a cada 10 segundos.

## Desenvolvimento

Requer Node e Chrome 116+.

```bash
npm install
npm run build
```

No Chrome: `chrome://extensions` → modo do desenvolvedor → Carregar sem compactação → pasta `dist`.

Zip local (mesmo artefato da CI):

```bash
npm run zip
```

Cada merge em `main` gera um release no GitHub com `muvuca.zip` anexado (e o mesmo arquivo como artifact do workflow).

Para iterar com hot reload:

```bash
npm run dev
```

## Stack

Vite, TypeScript, `@crxjs/vite-plugin` e Trystero (estratégia torrent) para a mesh. O peer fica vivo num documento offscreen.

## Aviso

É um brinquedo de mesh pública. Não trate o chat como privado. Qualquer peer na sala `muvuca-public` pode ver o que você manda.
