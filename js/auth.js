import { auth, db, col, STATE, onAuthStateChanged, signInAnonymously } from './config.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export function setupAuth() {
    // Tenta conectar ao Firebase
    signInAnonymously(auth).catch(err => console.error("Erro Firebase:", err));

    onAuthStateChanged(auth, (user) => {
        // Remove o loading assim que o Firebase responde
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');

        if (user) {
            // Se já estiver logado ou conectado, mostra a tela de login
            const loginView = document.getElementById('view-login');
            if (loginView) loginView.classList.remove('hidden');
            _setupSync();
        }
    });

    const form = document.getElementById('login-form');
    if (form) form.onsubmit = _handleLogin;
}

function _setupSync() {
    const watch = (name, key, cb) =>
        onSnapshot(col(name), snap => {
            STATE[key] = snap.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
            if (STATE.activeUser) cb?.();
        }, (err) => console.warn(`Erro ao sincronizar ${name}:`, err));

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
    if (window.lucide) window.lucide.createIcons();
}

function _handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('user-id').value.toLowerCase().trim();
    const p = document.getElementById('pass-id').value.trim();

    // Seus dados de acesso direto
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
    
    if (window.APP?.showToast) {
        window.APP.showToast('LOGIN OU SENHA INCORRETOS');
    } else {
        alert('Login ou senha incorretos');
    }
}
