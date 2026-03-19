import { auth, db, col, STATE, onAuthStateChanged, signInAnonymously } from './config.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export function setupAuth() {
    signInAnonymously(auth).catch(() => {});

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Garante que o loading suma e a tela de login apareça
            const loadingEl = document.getElementById('loading');
            const loginView = document.getElementById('view-login');
            if(loadingEl) loadingEl.classList.add('hidden');
            if(loginView) loginView.classList.remove('hidden');
            _setupSync();
        }
    });

    const form = document.getElementById('login-form');
    if(form) form.onsubmit = _handleLogin;
}

function _setupSync() {
    const watch = (name, key, cb) =>
        onSnapshot(col(name), snap => {
            STATE[key] = snap.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
            if (STATE.activeUser) cb?.();
        });

    watch('obras', 'obras', _refreshViews);
    watch('fornecedores', 'forn', () => {
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
}

function _refreshViews() {
    if (!STATE.activeUser) return;
    if (STATE.activeUser.role === 'MASTER') {
        window.APP?.renderMasterObrasGrid?.();
        if (STATE.currentObraId) window.APP?.renderObraDetail?.(STATE.currentObraId);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function _handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('user-id').value.toLowerCase().trim();
    const p = document.getElementById('pass-id').value.trim();

    const DEFAULT_GESTORES = [
        { nome: 'Andres Greco',  login: 'andresgreco',   senha: 'Arcco1452*' },
        { nome: 'Lucas Barbosa', login: 'lucas barbosa', senha: 'Arcco1452*' }
    ];

    const gestor = [...DEFAULT_GESTORES, ...(STATE.gestores || [])]
        .find(g => g.login.toLowerCase() === u && g.senha === p);

    if (gestor) {
        STATE.activeUser = { role: 'MASTER', name: gestor.nome, login: gestor.login };
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-master').classList.remove('hidden');
        _refreshViews();
        return;
    }
    window.APP?.showToast?.('LOGIN OU SENHA INCORRETOS');
}
