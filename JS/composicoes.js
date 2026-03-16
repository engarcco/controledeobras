// ============================================================
// composicoes.js — Banco de Composições
// ============================================================

import { STATE, apiAdd, apiUpdate, apiDelete, fmtBRL } from './config.js';
import { showToast, openModal, closeModal } from './ui.js';

export function renderComposicoesList(){
    const grid = document.getElementById('composicoes-list');
    if(!grid) return;
    grid.innerHTML = STATE.composicoes.map(c => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-5 border-b border-gray-100">
                <span class="text-[10px] font-bold text-arcco-black bg-arcco-lime px-2 py-1 rounded uppercase">${c.codigo}</span>
                <h5 class="font-bold text-sm uppercase mt-3 text-arcco-black leading-tight">${c.desc}</h5>
            </div>
            <div class="bg-gray-50 p-4 grid grid-cols-2 gap-3 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">
                <div>MO: <span class="text-gray-800">${fmtBRL(c.mo)}</span></div>
                <div>MAT: <span class="text-gray-800">${fmtBRL(c.mat)}</span></div>
                <div>EQ: <span class="text-gray-800">${fmtBRL(c.eq)}</span></div>
                <div>OUTROS: <span class="text-gray-800">${fmtBRL(c.ou)}</span></div>
                <div class="col-span-2 pt-2 border-t border-gray-200">BDI: <span class="text-arcco-black bg-arcco-lime/30 px-1.5 py-0.5 rounded">${c.bdi||0}%</span></div>
            </div>
            <div class="bg-gray-100 flex p-3 gap-2">
                <button onclick="APP.editComposicao('${c.firebaseId}')" class="flex-1 bg-white border border-gray-300 text-gray-600 font-bold text-[10px] uppercase py-2 rounded shadow-sm hover:bg-gray-200 flex justify-center items-center gap-1"><i data-lucide="edit-3" class="w-3 h-3"></i> Editar</button>
                <button onclick="APP.deleteComposicao('${c.firebaseId}')" class="w-10 bg-white border border-gray-300 text-gray-400 rounded shadow-sm hover:text-arcco-red hover:bg-red-50 flex justify-center items-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>`).join('') || '<div class="col-span-full p-8 text-center bg-white rounded-xl border border-gray-200"><p class="text-sm font-bold text-gray-400 uppercase">Nenhuma composição cadastrada.</p></div>';
    lucide.createIcons();
}

export const openModalComposicao = () => {
    STATE.editingCompId = null;
    document.getElementById('modal-comp-title').innerText = 'Nova Composição';
    ['comp-codigo','comp-desc','comp-mo','comp-mat','comp-eq','comp-ou','comp-bdi'].forEach(id => document.getElementById(id).value = '');
    openModal('modal-composicao');
};

export const editComposicao = (id) => {
    const c = STATE.composicoes.find(x => x.firebaseId===id);
    STATE.editingCompId = id;
    document.getElementById('modal-comp-title').innerText = 'Editar Composição';
    document.getElementById('comp-codigo').value = c.codigo;
    document.getElementById('comp-desc').value   = c.desc;
    document.getElementById('comp-mo').value     = c.mo||'';
    document.getElementById('comp-mat').value    = c.mat||'';
    document.getElementById('comp-eq').value     = c.eq||'';
    document.getElementById('comp-ou').value     = c.ou||'';
    document.getElementById('comp-bdi').value    = c.bdi||'';
    openModal('modal-composicao');
};

export const saveComposicao = async () => {
    const data = {
        codigo: document.getElementById('comp-codigo').value.trim().toUpperCase(),
        desc:   document.getElementById('comp-desc').value.trim(),
        mo:     parseFloat(document.getElementById('comp-mo').value)||0,
        mat:    parseFloat(document.getElementById('comp-mat').value)||0,
        eq:     parseFloat(document.getElementById('comp-eq').value)||0,
        ou:     parseFloat(document.getElementById('comp-ou').value)||0,
        bdi:    parseFloat(document.getElementById('comp-bdi').value)||0,
        timestamp: Date.now()
    };
    if(!data.codigo||!data.desc) return showToast('Preencha Código e Descrição');
    if(STATE.editingCompId){ await apiUpdate('composicoes',STATE.editingCompId,data); showToast('COMPOSIÇÃO ATUALIZADA'); }
    else { await apiAdd('composicoes',data); showToast('COMPOSIÇÃO CADASTRADA'); }
    closeModal();
};

export const deleteComposicao = async (id) => { if(confirm('Excluir composição?')) await apiDelete('composicoes',id); };

export const populaSelectComposicoes = () => {
    const sel = document.getElementById('task-comp-select');
    if(sel) sel.innerHTML = '<option value="">+ IMPORTAR PADRÃO</option>' +
        [...STATE.composicoes].sort((a,b) => a.codigo.localeCompare(b.codigo))
            .map(c => `<option value="${c.firebaseId}">[${c.codigo}] ${c.desc}</option>`).join('');
};

export const aplicarComposicao = () => {
    const sel = document.getElementById('task-comp-select');
    if(!sel.value) return;
    const c = STATE.composicoes.find(x => x.firebaseId===sel.value);
    if(c){
        document.getElementById('task-nome').value      = `[${c.codigo}] ${c.desc}`;
        document.getElementById('task-mo').value        = c.mo||'';
        document.getElementById('task-mat').value       = c.mat||'';
        document.getElementById('task-eq').value        = c.eq||'';
        document.getElementById('task-ou').value        = c.ou||'';
        document.getElementById('task-taxa-tipo').value = 'BDI';
        document.getElementById('task-taxa-pct').value  = c.bdi||'';
        const { calcTotalTask } = await import('./obras.js');
        calcTotalTask();
        showToast('Composição aplicada!');
    }
    sel.value = '';
};
