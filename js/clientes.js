// ============================================================
// clientes.js — Base de Clientes
// ============================================================

import { STATE, apiAdd, apiUpdate, apiDelete } from './config.js';
import { showToast, openModal, closeModal } from './ui.js';

export function renderClientsList(){
    const grid = document.getElementById('clients-list');
    grid.innerHTML = STATE.clients.map(c => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between overflow-hidden">
            <div class="p-6">
                <h5 class="font-montserrat font-bold text-lg uppercase leading-tight text-arcco-black">${c.nome}</h5>
                <p class="text-[10px] font-bold text-gray-400 uppercase mt-1 mb-5">CLIENTE</p>
                <div class="space-y-3">
                    <div class="flex items-start gap-3"><div class="bg-gray-100 p-1.5 rounded text-gray-400 shrink-0"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i></div><p class="text-xs font-bold text-gray-600 uppercase mt-1">${c.end}</p></div>
                    <div class="flex items-center gap-3"><div class="bg-gray-100 p-1.5 rounded text-gray-400 shrink-0"><i data-lucide="key" class="w-3.5 h-3.5"></i></div><p class="text-xs font-bold text-gray-600 uppercase mt-1">ID: <span class="text-arcco-black bg-arcco-lime px-1.5 py-0.5 rounded">${c.login||c.id}</span></p></div>
                </div>
            </div>
            <div class="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center">
                <div class="flex gap-2">
                    <a href="https://wa.me/55${(c.tel||'').replace(/\D/g,'')}" target="_blank" class="w-9 h-9 rounded bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow-sm"><i data-lucide="message-circle" class="w-4 h-4"></i></a>
                    <button onclick="APP.editClient('${c.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-gray-100 shadow-sm"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                </div>
                <button onclick="APP.deleteClient('${c.firebaseId}')" class="text-xs font-bold text-gray-400 hover:text-arcco-red uppercase flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i> Remover</button>
            </div>
        </div>`).join('');
    lucide.createIcons();
}

export const openModalNovoCliente = () => {
    STATE.editingClientId = null;
    document.getElementById('modal-cli-title').innerText = 'Cadastrar Cliente';
    ['cli-nome','cli-tel','cli-login','cli-senha','cli-end','cli-notas'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    openModal('modal-novo-cliente');
};

export const editClient = (id) => {
    const c = STATE.clients.find(x => x.firebaseId===id);
    STATE.editingClientId = id;
    document.getElementById('modal-cli-title').innerText = 'Editar Cliente';
    document.getElementById('cli-nome').value  = c.nome;
    document.getElementById('cli-tel').value   = c.tel;
    document.getElementById('cli-login').value = c.login||c.id;
    document.getElementById('cli-senha').value = c.senha||'';
    document.getElementById('cli-end').value   = c.end;
    document.getElementById('cli-notas').value = c.notas||'';
    openModal('modal-novo-cliente');
};

export const saveNovoCliente = async () => {
    const data = {
        nome:  document.getElementById('cli-nome').value,
        tel:   document.getElementById('cli-tel').value,
        login: document.getElementById('cli-login').value,
        senha: document.getElementById('cli-senha').value,
        end:   document.getElementById('cli-end').value,
        notas: document.getElementById('cli-notas').value,
        status:'ativo'
    };
    if(!data.nome||!data.tel||!data.login||!data.senha) return showToast('Preencha Nome, Tel, Login e Senha');
    if(STATE.editingClientId){ await apiUpdate('clientes',STATE.editingClientId,data); showToast('CLIENTE ATUALIZADO'); }
    else { await apiAdd('clientes',{...data,id:data.login,timestamp:Date.now()}); showToast('CLIENTE CADASTRADO'); }
    closeModal();
};

export const deleteClient = async (id) => { if(confirm('Excluir cliente?')) await apiDelete('clientes',id); };

export const populaSelectClientes = () => {
    const sel = document.getElementById('new-obra-cliente');
    if(sel) sel.innerHTML = '<option value="">(SELECIONE O CLIENTE)</option>' +
        STATE.clients.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
};
