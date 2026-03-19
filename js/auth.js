// ============================================================
// auth.js — Login, Autenticação Firebase e Sincronização
// ============================================================
// IMPORTANTE: Este módulo NÃO importa outros módulos da app
// para evitar dependências circulares. Chama tudo via window.APP
// que é montado pelo main.js antes de setupAuth() ser chamado.
// ============================================================

import { auth, db, col, STATE,
         onAuthStateChanged, signInAnonymously }
    from './config.js';

import { onSnapshot }
    from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// ── Ponto de entrada chamado pelo main.js ─────────────────────
export function setupAuth() {

    // 1. Autenticação anônima (necessária para Firestore)
    signInAnonymously(auth).catch(() => {});

    // 2. Quando Firebase confirmar o usuário anônimo → esconde loading, mostra login
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('view-login').classList.remove('hidden');
            _setupSync();
        }
    });

    // 3. Listener do formulário de login
    document.getElementById('login-form').onsubmit = _handleLogin;
}

// ── Sincronização em tempo real (watchers Firestore) ──────────
function _setupSync() {
    const watch = (name, key, cb) =>
        onSnapshot(col(name), snap => {
            STATE[key] = snap.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
            if (STATE.activeUser) cb?.();
        });

    watch('obras',        'obras',       _refreshViews);
    watch('fornecedores', 'forn',        () => {
        if (STATE.activeUser?.role === 'MASTER') {
            window.APP?.renderFornAdmin?.();
            window.APP?.populaSelectManualForn?.();
        }
    });
    watch('clientes', 'clients', () => {
        if (STATE.activeUser?.role === 'MASTER') {
            window.APP?.renderClientsList?.();
            window.APP?.populaSelectClientes?.();
        }
    });
    watch('gestores', 'gestores', () => {
        if (STATE.activeUser?.role === 'MASTER')
            window.APP?.renderListaGestores?.();
    });
    watch('composicoes', 'composicoes', () => {
        if (STATE.activeUser?.role === 'MASTER') {
            window.APP?.renderComposicoesList?.();
            window.APP?.populaSelectComposicoes?.();
        }
    });
}

// ── Dispatcher de refresh por role ────────────────────────────
function _refreshViews() {
    if (!STATE.activeUser) return;

    if (STATE.activeUser.role === 'MASTER') {
        const el = document.getElementById('master-logged-name');
        if (el) el.innerText = `| ${STATE.activeUser.name}`;
        const mob = document.getElementById('master-logged-name-mobile');
        if (mob) mob.innerText = STATE.activeUser.name;
        window.APP?.renderMasterObrasGrid?.();
        if (STATE.currentObraId) window.APP?.renderObraDetail?.(STATE.currentObraId);
    }
    if (STATE.activeUser.role === 'FORNECEDOR') window.APP?.renderFornDash?.();
    if (STATE.activeUser.role === 'MEMBRO')     window.APP?.renderMembroDash?.();
    if (STATE.activeUser.role === 'CLIENTE')    window.APP?.renderClienteDash?.();

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Handler do formulário de login ────────────────────────────
function _handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('user-id').value.toLowerCase().trim();
    const p = document.getElementById('pass-id').value.trim();

    const DEFAULT_GESTORES = [
        { nome: 'Andres Greco',  login: 'andresgreco',   senha: 'Arcco1452*' },
        { nome: 'Lucas Barbosa', login: 'lucas barbosa', senha: 'Arcco1452*' }
    ];

    // ── MASTER ────────────────────────────────────────────────
    const gestor = [...DEFAULT_GESTORES, ...STATE.gestores]
        .find(g => g.login.toLowerCase() === u && g.senha === p);

    if (gestor) {
        STATE.activeUser = { role: 'MASTER', name: gestor.nome, login: gestor.login };
        _showView('view-master');
        _refreshViews();
        window.APP?.renderFornAdmin?.();
        window.APP?.renderClientsList?.();
        window.APP?.populaSelectClientes?.();
        window.APP?.populaSelectManualForn?.();
        window.APP?.renderComposicoesList?.();
        window.APP?.populaSelectComposicoes?.();
        window.APP?.renderListaGestores?.();
        return;
    }

    // ── FORNECEDOR / MEMBRO ───────────────────────────────────
    const f = STATE.forn.find(
        x => (x.login || x.id).toLowerCase() === u && x.status === 'ativo'
    );

    if (f && p === f.senha) {
        if (f.vinculo === 'MASTER') {
            STATE.activeUser = {
                role: 'FORNECEDOR', name: f.nome, id: f.id,
                vinculo: f.vinculo, firebaseId: f.firebaseId
            };
            const el = document.getElementById('forn-header-name');
            if (el) el.innerText = f.nome;
            _showView('view-fornecedor');
            _refreshViews();
        } else {
            const lider = STATE.forn.find(x => x.id === f.vinculo);
            STATE.activeUser = {
                role: 'MEMBRO', name: f.nome, id: f.id,
                vinculo: f.vinculo, liderNome: lider?.nome || '',
                firebaseId: f.firebaseId
            };
            const el = document.getElementById('membro-header-name');
            if (el) el.innerText = f.nome;
            _showView('view-membro');
            _refreshViews();
        }
        return;
    }

    // ── CLIENTE ───────────────────────────────────────────────
    const c = STATE.clients.find(x => (x.login || x.id).toLowerCase() === u);
    if (c && p === c.senha) {
        STATE.activeUser = { role: 'CLIENTE', name: c.nome, id: c.id };
        _showView('view-cliente');
        _refreshViews();
        return;
    }

    window.APP?.showToast?.('LOGIN OU SENHA INCORRETOS');
}

// ── Helpers ───────────────────────────────────────────────────
function _showView(id) {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
}
