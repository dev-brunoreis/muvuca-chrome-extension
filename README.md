# Muvuca

Extensão Chrome (Manifest V3) com uma mesh P2P pública. O core só mantém o peer vivo e um registry de módulos — features entram como plugins.

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

## Módulos

Registre um `ModuleDefinition` e acrescente em `src/modules/index.ts` (`allModules`). O service worker registra a lista, o popup desenha os toggles, e envelopes da mesh chegam em `onPeerMessage`.

Se o módulo precisar mexer no DOM da página, volte a declarar `content_scripts` e `host_permissions` em `manifest.config.ts` e inicialize o adapter em `src/content/entry.ts`.

## Stack

Vite, TypeScript, `@crxjs/vite-plugin` e Trystero (estratégia torrent) para a mesh. O peer fica vivo num documento offscreen.

## Aviso

É uma mesh pública. Qualquer peer na sala `muvuca-public` pode ver o que o módulo mandar.
