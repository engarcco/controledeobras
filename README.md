# ARCCO HUB — Módulos JS

## Estrutura de arquivos

```
controledeobras/
└── js/
    ├── main.js            ← PONTO DE ENTRADA (substitui o <script> inline do HTML)
    ├── config.js          ← Firebase config, STATE global, helpers (apiAdd/Update/Delete, fmtBRL, etc.)
    ├── ui.js              ← Toast, modais, menus, switchObraTab, showMasterSection
    ├── auth.js            ← onAuthStateChanged, setupSync (watchers Firestore), login
    ├── obras.js           ← Grid de obras, detalhe, cronograma, compras, módulos EAP
    ├── medicoes.js        ← Medições, diárias
    ├── curvas.js          ← Curva S, ABC e Orçamento Analítico
    ├── ponto.js           ← Folha de Ponto (master + líder + membro), check-in
    ├── fornecedores.js    ← Gestão de equipes e parceiros
    ├── clientes.js        ← Gestão de clientes
    ├── gestores.js        ← Gestão de gestores master
    ├── composicoes.js     ← Banco de composições
    ├── portal-forn.js     ← Dashboard e checklist do fornecedor (líder)
    ├── portal-membro.js   ← Dashboard do membro subordinado
    ├── portal-cliente.js  ← Dashboard do cliente
    └── offline.js         ← Fila localStorage + sincronização offline
```

## Como integrar ao HTML

Substitua todo o bloco `<script type="module">...</script>` no final do `<body>` por **uma única linha**:

```html
<script type="module" src="js/main.js"></script>
```

Remova também o segundo bloco de registro do Service Worker que fica no `<head>` (o `main.js` já cuida disso).

## Dependências externas (já no HTML)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://unpkg.com/lucide@latest"></script>
```

Mantenha-as antes do `<script type="module" src="js/main.js"></script>`.

## Notas importantes

- Todos os módulos usam **ES Modules** (`import`/`export`) — precisam de servidor HTTP (não abre por `file://`).
- O `auth.js` exporta `setupAuth(callbacks)` — o `main.js` passa todas as funções de render como callbacks para evitar dependências circulares.
- O `aplicarComposicao` em `composicoes.js` usa import dinâmico de `obras.js` para evitar circularidade.
- A sincronização offline está em `offline.js` e é iniciada pelo `main.js` via `initOfflineListeners()`.
