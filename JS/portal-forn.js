// ============================================================
// portal-forn.js — Portal do Fornecedor (Líder de Equipe)
// ============================================================

import { STATE, apiUpdate, today, parseDate, fmtBRL, fmtDate, todayISO } from './config.js';
import { showToast } from './ui.js';
// renderFornPontoLider chamado via window.APP para evitar dependência circular
import { switchFornTab } from './ui.js';

export function renderFornDash(){
    const cont    = document.getElementById('fornecedor-content');
    const myObras = STATE.obras.filter(o => o.tasks?.some(t => t.forn===STATE.activeUser.id));
    const now     = today();

    // Badge check-ins pendentes
    const membrosEquipe = STATE.forn.filter(f => f.vinculo===STATE.activeUser.id&&f.status==='ativo');
    const membroNomes   = membrosEquipe.map(m => m.nome);
    let pendCheckins = 0;
    STATE.obras.forEach(o => (o.checkins||[]).forEach(c => {
        if(membroNomes.includes(c.membroNome)&&c.statusLider!=='aprovado'&&c.statusLider!=='recusado') pendCheckins++;
    }));
    const badge = document.getElementById('ponto-badge');
    if(badge){ if(pendCheckins>0){ badge.classList.remove('hidden'); badge.innerText=pendCheckins; } else badge.classList.add('hidden'); }

    cont.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="font-montserrat font-bold text-xl uppercase text-arcco-black">Meus Projetos</h3>
                <p class="text-xs text-gray-500 font-bold uppercase mt-0.5">Visão consolidada por obra</p>
            </div>
            <button onclick="APP.abrirCheckin()" class="bg-arcco-black text-white font-montserrat font-bold text-xs uppercase px-4 py-2.5 rounded shadow hover:bg-gray-800 flex items-center gap-2">
                <i data-lucide="fingerprint" class="w-4 h-4 text-arcco-lime"></i> Meu Check-in
            </button>
        </div>
        <div class="space-y-6">
        ${myObras.map(o => {
            const mt    = o.tasks.filter(t => t.forn===STATE.activeUser.id);
            const concl = mt.filter(t => t.status===2).length;
            const pend  = mt.filter(t => t.status!==2).length;
            const atras = mt.filter(t => t.status!==2&&t.fim&&parseDate(t.fim)<now).length;
            const criticos = mt.filter(t => t.atencao&&t.status!==2).length;
            const pct   = mt.length?Math.round(concl/mt.length*100):0;
            return `
            <div class="bg-white rounded-xl border ${atras>0?'border-red-200':'border-gray-200'} shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="font-montserrat font-bold text-base uppercase leading-tight text-arcco-black">${o.nome}</h4>
                            <p class="text-[9px] font-bold text-gray-400 uppercase mt-0.5">${o.tipo||'OBRA'}</p>
                        </div>
                        <span class="font-montserrat font-black-italic text-xl text-gray-700">${pct}%</span>
                    </div>
                    <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                        <div class="h-full bg-arcco-lime transition-all duration-500 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center"><p class="text-[8px] font-bold text-gray-400 uppercase">Total</p><p class="font-montserrat font-bold text-lg text-arcco-black">${mt.length}</p></div>
                        <div class="bg-arcco-lime/10 border border-arcco-lime/30 rounded-lg p-2 text-center"><p class="text-[8px] font-bold text-gray-600 uppercase">Concluídas</p><p class="font-montserrat font-bold text-lg text-arcco-black">${concl}</p></div>
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center"><p class="text-[8px] font-bold text-blue-500 uppercase">Pendentes</p><p class="font-montserrat font-bold text-lg text-arcco-black">${pend}</p></div>
                        <div class="${atras>0?'bg-red-50 border-red-200':'bg-gray-50 border-gray-200'} border rounded-lg p-2 text-center"><p class="text-[8px] font-bold ${atras>0?'text-arcco-red':'text-gray-400'} uppercase">Atrasos</p><p class="font-montserrat font-bold text-lg ${atras>0?'text-arcco-red':'text-gray-300'}">${atras}</p></div>
                    </div>
                    ${criticos>0?`<div class="mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2"><i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-arcco-red shrink-0"></i><p class="text-[9px] font-bold text-arcco-red uppercase">${criticos} item(s) crítico(s) pendente(s)</p></div>`:''}
                </div>
                <div class="p-4 bg-gray-50">
                    <button onclick="APP.renderFornChecklist('${o.firebaseId}')" class="w-full bg-arcco-black text-white font-montserrat font-bold text-xs uppercase py-3 rounded hover:bg-gray-800 flex items-center justify-center gap-2">
                        <i data-lucide="hard-hat" class="w-4 h-4 text-arcco-lime"></i> Abrir Checklist da Obra
                    </button>
                </div>
            </div>`;
        }).join('')||'<div class="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm font-bold text-gray-400 uppercase">Nenhum serviço atribuído.</div>'}
        </div>`;
    lucide.createIcons();
}

export const renderFornChecklist = (id) => {
    STATE.currentObraId = id;
    const o        = STATE.obras.find(x => x.firebaseId===id);
    const cont     = document.getElementById('fornecedor-content');
    const myTasks  = o.tasks.filter(t => t.forn===STATE.activeUser.id);
    const now      = today();
    const atrasadas   = myTasks.filter(t => t.status!==2&&t.fim&&parseDate(t.fim)<now);
    const emAndamento = myTasks.filter(t => t.status!==2&&!atrasadas.includes(t)&&t.inicio&&parseDate(t.inicio)<=now&&parseDate(t.fim)>=now);
    const pendentes   = myTasks.filter(t => t.status===0&&!atrasadas.includes(t)&&!emAndamento.includes(t));
    const foco     = emAndamento[0]||pendentes[0]||null;
    const isSubord = STATE.activeUser.vinculo!=='MASTER';
    const minhasCompras = (o.compras||[]).filter(c => c.forn===STATE.activeUser.name);

    const { openModalNovaCompra } = await import('./obras.js');

    cont.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <button onclick="APP.renderFornDash()" class="text-xs font-bold text-gray-500 hover:text-arcco-black flex items-center gap-1 uppercase"><i data-lucide="arrow-left" class="w-4 h-4"></i> Projetos</button>
            ${!isSubord?`<button onclick="APP.openModalNovaCompra()" class="text-[10px] font-bold bg-arcco-black text-white px-3 py-2 rounded uppercase hover:bg-gray-800 flex items-center gap-1"><i data-lucide="shopping-cart" class="w-3 h-3"></i> Lançar Material</button>`:''}
        </div>
        <div class="mb-6 border-b border-gray-200 pb-4"><h3 class="font-montserrat font-black-italic text-3xl text-arcco-black tracking-tighter">${o.nome}</h3></div>
        ${foco?`<div class="bg-arcco-black text-white p-6 rounded-xl mb-8 shadow-md relative overflow-hidden border border-gray-800"><div class="absolute top-0 left-0 w-1.5 h-full bg-arcco-lime"></div><h4 class="text-arcco-lime font-bold uppercase text-[10px] tracking-widest mb-3 flex items-center gap-2"><i data-lucide="target" class="w-3.5 h-3.5"></i> Foco de Hoje</h4><p class="text-xs text-gray-400 font-bold uppercase mb-1">${foco.modulo}</p><h5 class="text-xl font-bold uppercase leading-tight mb-4">${foco.nome}</h5>${!isSubord?`<button onclick="APP.fornToggleStatus('${id}','${foco.id}')" class="w-full bg-arcco-lime text-arcco-black font-bold uppercase text-xs py-3 rounded hover:brightness-95">${foco.status===1?'Retirar de Vistoria':'Solicitar Vistoria'}</button>`:`<div class="text-center bg-gray-800 text-gray-400 text-[10px] font-bold uppercase py-2 rounded">Visualização de Subordinado</div>`}</div>`:''}
        <div class="space-y-4">
            <h4 class="font-montserrat font-bold text-sm uppercase text-gray-400 tracking-wider mb-2">Checklist Completo</h4>
            ${myTasks.map(t => {
                const isBlocked = t.dep?.some(dId => { const dt=o.tasks.find(x=>x.id===dId); return dt&&dt.status!==2; });
                const isLate    = atrasadas.includes(t);
                const btn = !isSubord
                    ?`<button onclick="APP.fornToggleStatus('${id}','${t.id}')" ${isBlocked?'disabled':''} class="w-full sm:w-auto px-6 py-4 rounded-lg text-xs font-bold uppercase shadow-sm ${t.status===2?'bg-gray-200 text-gray-500 cursor-not-allowed':t.status===1?'bg-orange-100 border border-orange-300 text-orange-700':'bg-gray-100 text-arcco-black border border-gray-300 hover:bg-gray-200'}">${t.status===2?'<i data-lucide="check-circle-2" class="inline w-4 h-4 mr-1"></i> FINALIZADO':t.status===1?'<i data-lucide="eye" class="inline w-4 h-4 mr-1"></i> EM VISTORIA':'MARCAR PRONTO'}</button>`
                    :`<span class="px-4 py-2 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase rounded">Visualização</span>`;
                return `<div class="bg-white p-6 rounded-xl border ${isLate?'border-red-300':'border-gray-200'} shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 ${isBlocked?'alert-blocked':''} ${t.status===2?'opacity-50 bg-gray-50':''}"><div class="flex-1 w-full"><div class="flex items-center gap-2 mb-1"><p class="text-[10px] font-bold text-gray-400 uppercase">${t.modulo}</p>${isLate?`<span class="bg-red-100 text-arcco-red px-2 py-0.5 rounded text-[8px] font-bold uppercase">Atrasado</span>`:''}</div><h5 class="text-base font-bold uppercase leading-tight text-arcco-black">${t.nome}</h5>${isBlocked?`<p class="text-[10px] font-bold text-arcco-red uppercase mt-2 flex items-center gap-1 bg-red-50 p-2 rounded w-fit"><i data-lucide="lock" class="w-3 h-3"></i> Aguardando liberação</p>`:''}</div>${btn}</div>`;
            }).join('')}
        </div>`;
    lucide.createIcons();
};

export const fornToggleStatus = async (fId, tId) => {
    const o  = STATE.obras.find(x => x.firebaseId===fId);
    const t  = o.tasks.find(x => x.id===tId);
    if(t.status===2) return showToast('Apenas a Arcco pode reabrir.');
    const ns = t.status===1?0:1;
    const tasks = o.tasks.map(x => x.id===tId?{...x,status:ns,concluidoPor:ns===1?STATE.activeUser.name:null}:x);
    await apiUpdate('obras',fId,{tasks});
    renderFornChecklist(fId);
    showToast(ns===1?'Enviado para vistoria!':'Vistoria cancelada.');
};
