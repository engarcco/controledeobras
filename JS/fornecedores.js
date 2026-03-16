// ============================================================
// fornecedores.js — Equipes e Parceiros
// ============================================================

import { STATE, apiAdd, apiUpdate, apiDelete, fmtBRL } from './config.js';
import { showToast, openModal, closeModal } from './ui.js';

export function renderFornAdmin(){
    const cont   = document.getElementById('forn-groups-container');
    const ativos = STATE.forn.filter(f => f.status==='ativo');
    let lideres  = ativos.filter(f => f.vinculo==='MASTER');
    const orfaos = ativos.filter(f => f.vinculo!=='MASTER'&&!lideres.map(l=>l.id).includes(f.vinculo));
    lideres = [...lideres,...orfaos];

    cont.innerHTML = lideres.map(lider => {
        const membros = ativos.filter(m => m.vinculo===lider.id);
        return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="bg-gray-100 border-b border-gray-200 py-3 px-5 flex justify-between items-center">
                <h4 class="text-xs font-bold uppercase text-arcco-black flex items-center gap-2"><i data-lucide="shield-check" class="w-4 h-4 text-arcco-lime"></i> LÍDER: ${lider.nome}</h4>
            </div>
            <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                ${[lider,...membros].map((f,i) => fornCardHtml(f,i===0)).join('')}
            </div>
        </div>`;
    }).join('');

    const pends    = STATE.forn.filter(f => f.status==='pendente');
    const contAppr = document.getElementById('forn-approval-container');
    const listAppr = document.getElementById('forn-approval-list');
    if(pends.length){
        contAppr.classList.remove('hidden');
        listAppr.innerHTML = pends.map(p => `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <div>
                    <p class="text-xs font-bold uppercase text-arcco-black">${p.nome} <span class="text-gray-400 font-normal">(${p.doc})</span></p>
                    <p class="text-[10px] font-bold text-gray-500 uppercase mt-1">${p.espec} • ${p.tel}</p>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button onclick="APP.editForn('${p.firebaseId}')" class="flex-1 bg-arcco-lime text-arcco-black font-bold text-xs uppercase px-5 py-2 rounded hover:brightness-95">Revisar & Aprovar</button>
                    <button onclick="APP.deleteForn('${p.firebaseId}')" class="flex-1 bg-red-50 border border-red-200 text-arcco-red font-bold uppercase text-xs px-5 py-2 rounded hover:bg-red-100">Rejeitar</button>
                </div>
            </div>`).join('');
    } else { contAppr.classList.add('hidden'); }
    lucide.createIcons();
}

function fornCardHtml(f, isLider){
    return `
    <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm ${!isLider?'opacity-80':''}">
        <div class="flex gap-4 items-center mb-5">
            <div class="w-${isLider?12:10} h-${isLider?12:10} rounded-full ${isLider?'bg-arcco-black text-arcco-lime':'bg-gray-200 text-gray-400'} flex items-center justify-center font-bold text-${isLider?'lg':'sm'} uppercase shrink-0 shadow">
                ${isLider?f.nome.charAt(0):`<i data-lucide="user" class="w-4 h-4"></i>`}
            </div>
            <div class="overflow-hidden">
                <h5 class="font-bold text-${isLider?'sm':'xs'} uppercase text-arcco-black truncate">${f.nome}</h5>
                <span class="text-[10px] font-bold text-gray-500 uppercase truncate block mt-0.5">${f.espec}</span>
                ${f.diaria?`<span class="text-[9px] font-bold text-arcco-lime bg-arcco-black px-1.5 py-0.5 rounded mt-1 inline-block">Diária: ${fmtBRL(f.diaria)}</span>`:''}
            </div>
        </div>
        <div class="flex gap-2 justify-end pt-3 border-t border-gray-100">
            <a href="https://wa.me/55${(f.tel||'').replace(/\D/g,'')}" target="_blank" class="w-8 h-8 bg-green-50 text-green-600 rounded flex items-center justify-center hover:bg-green-100"><i data-lucide="message-circle" class="w-4 h-4"></i></a>
            <button onclick="APP.editForn('${f.firebaseId}')" class="w-8 h-8 bg-gray-50 text-gray-600 rounded flex items-center justify-center hover:bg-gray-100"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
            <button onclick="APP.deleteForn('${f.firebaseId}')" class="w-8 h-8 bg-red-50 text-red-500 rounded flex items-center justify-center hover:bg-red-100"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    </div>`;
}

export const toggleLiderSelect = () => {
    const isLider = document.getElementById('man-is-lider').checked;
    document.getElementById('div-man-vinculo').classList.toggle('hidden',isLider);
};

export const openModalManualForn = () => {
    STATE.editingFornId = null;
    document.getElementById('man-forn-title').innerText = 'Cadastrar Parceiro';
    ['man-nome','man-email','man-tel','man-login','man-senha','man-rua','man-num','man-bairro','man-cidade','man-espec','man-diaria'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('man-is-lider').checked = true;
    toggleLiderSelect();
    openModal('modal-manual-forn');
};

export const editForn = (id) => {
    const f = STATE.forn.find(x => x.firebaseId===id);
    STATE.editingFornId = id;
    document.getElementById('man-forn-title').innerText = 'Editar/Aprovar Parceiro';
    document.getElementById('man-nome').value   = f.nome;
    document.getElementById('man-email').value  = f.email||'';
    document.getElementById('man-tel').value    = f.tel;
    document.getElementById('man-login').value  = f.login||f.id;
    document.getElementById('man-senha').value  = f.senha||'';
    document.getElementById('man-rua').value    = f.rua||'';
    document.getElementById('man-num').value    = f.num||'';
    document.getElementById('man-bairro').value = f.bairro||'';
    document.getElementById('man-cidade').value = f.cidade||'';
    document.getElementById('man-espec').value  = f.espec;
    document.getElementById('man-diaria').value = f.diaria||'';
    document.getElementById('man-is-lider').checked = f.vinculo==='MASTER';
    toggleLiderSelect();
    if(f.vinculo!=='MASTER') document.getElementById('man-vinculo').value = f.vinculo;
    openModal('modal-manual-forn');
};

export const saveManualForn = async () => {
    const isLider = document.getElementById('man-is-lider').checked;
    const rua     = document.getElementById('man-rua').value;
    const data = {
        nome:   document.getElementById('man-nome').value,
        email:  document.getElementById('man-email').value,
        tel:    document.getElementById('man-tel').value,
        login:  document.getElementById('man-login').value,
        senha:  document.getElementById('man-senha').value,
        rua, num: document.getElementById('man-num').value,
        bairro: document.getElementById('man-bairro').value,
        cidade: document.getElementById('man-cidade').value,
        end:    `${rua}, ${document.getElementById('man-num').value}`,
        espec:  document.getElementById('man-espec').value,
        diaria: parseFloat(document.getElementById('man-diaria').value)||0,
        vinculo: isLider?'MASTER':document.getElementById('man-vinculo').value,
        status: 'ativo', aprovadoPor: STATE.activeUser.name
    };
    if(!data.nome||!data.tel||!data.login||!data.senha) return showToast('Preencha Nome, WhatsApp, Login e Senha!');
    if(STATE.editingFornId){ await apiUpdate('fornecedores',STATE.editingFornId,data); showToast('PARCEIRO ATUALIZADO!'); }
    else { await apiAdd('fornecedores',{...data,id:data.login}); showToast('PARCEIRO CADASTRADO'); }
    closeModal();
};

export const submitRegForn = async () => {
    const rua = document.getElementById('reg-rua').value;
    const data = {
        nome:  document.getElementById('reg-nome').value,
        doc:   document.getElementById('reg-doc').value,
        tel:   document.getElementById('reg-tel').value,
        email: document.getElementById('reg-email').value,
        rua, num: document.getElementById('reg-num').value,
        bairro: document.getElementById('reg-bairro').value,
        cidade: document.getElementById('reg-cidade').value,
        end:    `${rua}, ${document.getElementById('reg-num').value}`,
        espec:  document.getElementById('reg-espec').value,
        status: 'pendente', vinculo: 'MASTER',
        id: document.getElementById('reg-nome').value.split(' ')[0].toLowerCase()+Math.floor(Math.random()*100)
    };
    if(!data.nome||!data.tel||!data.doc) return showToast('Preencha campos obrigatórios!');
    await apiAdd('fornecedores',data);
    showToast('ENVIADO PARA AUDITORIA');
    closeModal();
};

export const deleteForn = async (id) => { if(confirm('Excluir parceiro?')) await apiDelete('fornecedores',id); };

export const populaSelectManualForn = () => {
    const sel = document.getElementById('man-vinculo');
    if(sel) sel.innerHTML = '<option value="">(SELECIONE UM LÍDER)</option>' +
        STATE.forn.filter(f => f.status==='ativo'&&f.vinculo==='MASTER').map(f => `<option value="${f.id}">EQUIPE DE ${f.nome}</option>`).join('');
};
