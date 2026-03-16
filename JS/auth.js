// ============================================================
// auth.js — Login, Autenticação e Sincronização Firebase
// ============================================================

import { auth, db, col, STATE, signInAnonymously, onAuthStateChanged } from './config.js';
import { showToast } from './ui.js';
import { renderMasterObrasGrid, renderObraDetail } from './obras.js';
import { renderFornAdmin, populaSelectManualForn } from './fornecedores.js';
import { renderClientsList, populaSelectClientes } from './clientes.js';
import { renderListaGestores } from './gestores.js';
import { renderComposicoesList, populaSelectComposicoes } from './composicoes.js';
import { renderFornDash } from './portal-forn.js';
import { renderMembroDash } from './portal-membro.js';
import { renderClienteDash } from './portal-cliente.js';
import { showMasterSection } from './ui.js';
import { onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ── Auth Firebase ─────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if(user){
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('view-login').classList.remove('hidden');
        setupSync();
    }
});
(async () => { try { await signInAnonymously(auth); } catch(e){} })();

// ── Sincronização em tempo real ───────────────────────────────
export function setupSync(){
    const watch = (name, key, cb) => onSnapshot(col(name), s => {
        STATE[key] = s.docs.map(d => ({firebaseId:d.id, ...d.data()}));
        if(STATE.activeUser) cb?.();
    });

    watch('obras',       'obras',       refreshViews);
    watch('fornecedores','forn',        () => { if(STATE.activeUser?.role==='MASTER'){ renderFornAdmin(); populaSelectManualForn(); } });
    watch('clientes',    'clients',     () => { if(STATE.activeUser?.role==='MASTER'){ renderClientsList(); populaSelectClientes(); } });
    watch('gestores',    'gestores',    () => { if(STATE.activeUser?.role==='MASTER') renderListaGestores(); });
    watch('composicoes', 'composicoes', () => { if(STATE.activeUser?.role==='MASTER'){ renderComposicoesList(); populaSelectComposicoes(); } });
}

// ── Dispatcher de refresh por role ────────────────────────────
export function refreshViews(){
    if(!STATE.activeUser) return;
    if(STATE.activeUser.role==='MASTER'){
        document.getElementById('master-logged-name').innerText = `| ${STATE.activeUser.name}`;
        const mobName = document.getElementById('master-logged-name-mobile');
        if(mobName) mobName.innerText = STATE.activeUser.name;
        renderMasterObrasGrid();
        if(STATE.currentObraId) renderObraDetail(STATE.currentObraId);
    }
    if(STATE.activeUser.role==='FORNECEDOR') renderFornDash();
    if(STATE.activeUser.role==='MEMBRO')     renderMembroDash();
    if(STATE.activeUser.role==='CLIENTE')    renderClienteDash();
    lucide.createIcons();
}

// ── Login form ────────────────────────────────────────────────
document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const u = document.getElementById('user-id').value.toLowerCase().trim();
    const p = document.getElementById('pass-id').value.trim();

    const DEFAULT_GESTORES = [
        {nome:'Andres Greco',  login:'andresgreco',   senha:'Arcco1452*'},
        {nome:'Lucas Barbosa', login:'lucas barbosa', senha:'Arcco1452*'}
    ];

    let gestor = [...DEFAULT_GESTORES, ...STATE.gestores]
        .find(g => g.login.toLowerCase()===u && g.senha===p);

    if(gestor){
        STATE.activeUser = {role:'MASTER', name:gestor.nome, login:gestor.login};
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-master').classList.remove('hidden');
        refreshViews();
        renderFornAdmin();
        renderClientsList();
        populaSelectClientes();
        populaSelectManualForn();
        return;
    }

    const f = STATE.forn.find(x => (x.login||x.id).toLowerCase()===u && x.status==='ativo');
    const c = STATE.clients.find(x => (x.login||x.id).toLowerCase()===u);

    if(f && p===f.senha){
        if(f.vinculo==='MASTER'){
            STATE.activeUser = {role:'FORNECEDOR', name:f.nome, id:f.id, vinculo:f.vinculo, firebaseId:f.firebaseId};
            document.getElementById('forn-header-name').innerText = f.nome;
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-fornecedor').classList.remove('hidden');
            refreshViews();
        } else {
            const lider = STATE.forn.find(x => x.id===f.vinculo);
            STATE.activeUser = {role:'MEMBRO', name:f.nome, id:f.id, vinculo:f.vinculo, liderNome:lider?.nome||'', firebaseId:f.firebaseId};
            document.getElementById('membro-header-name').innerText = f.nome;
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-membro').classList.remove('hidden');
            refreshViews();
        }
    } else if(c && p===c.senha){
        STATE.activeUser = {role:'CLIENTE', name:c.nome, id:c.id};
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-cliente').classList.remove('hidden');
        refreshViews();
    } else {
        showToast('LOGIN OU SENHA INCORRETOS');
    }
};
