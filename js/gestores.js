// ============================================================
// gestores.js — Equipe Gestora (Master)
// ============================================================

import { STATE, apiAdd, apiDelete } from './config.js';
import { showToast, openModal } from './ui.js';

export const openModalGestores = () => { renderListaGestores(); openModal('modal-gestores'); };

export function renderListaGestores(){
    const list = document.getElementById('list-gestores');
    if(!list) return;
    const pad = `
        <div class="flex justify-between items-center bg-gray-100 p-3 rounded border border-gray-200">
            <div><p class="text-xs font-bold text-arcco-black uppercase">Andres Greco</p><p class="text-[9px] text-gray-500 font-bold">Login: andresgreco</p></div>
            <span class="bg-arcco-black text-white text-[8px] uppercase font-bold px-2 py-1 rounded">Padrão</span>
        </div>
        <div class="flex justify-between items-center bg-gray-100 p-3 rounded border border-gray-200">
            <div><p class="text-xs font-bold text-arcco-black uppercase">Lucas Barbosa</p><p class="text-[9px] text-gray-500 font-bold">Login: lucas barbosa</p></div>
            <span class="bg-arcco-black text-white text-[8px] uppercase font-bold px-2 py-1 rounded">Padrão</span>
        </div>`;
    const cad = STATE.gestores.map(g => `
        <div class="flex justify-between items-center bg-white p-3 rounded border border-gray-200 shadow-sm">
            <div><p class="text-xs font-bold text-arcco-black uppercase">${g.nome}</p><p class="text-[9px] text-gray-500 font-bold">Login: ${g.login}</p></div>
            <button onclick="APP.deleteGestor('${g.firebaseId}')" class="text-gray-400 hover:text-arcco-red"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`).join('');
    list.innerHTML = pad+cad;
    lucide.createIcons();
}

export const saveNovoGestor = async () => {
    const n = document.getElementById('gest-nome').value;
    const l = document.getElementById('gest-login').value;
    const s = document.getElementById('gest-senha').value;
    if(!n||!l||!s) return showToast('PREENCHA TODOS OS DADOS');
    await apiAdd('gestores',{nome:n,login:l,senha:s});
    document.getElementById('gest-nome').value  = '';
    document.getElementById('gest-login').value = '';
    document.getElementById('gest-senha').value = '';
    showToast('GESTOR ADICIONADO');
};

export const deleteGestor = async (id) => { if(confirm('Remover gestor?')) await apiDelete('gestores',id); };
