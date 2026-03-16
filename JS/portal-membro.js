// ============================================================
// portal-membro.js — Portal do Membro de Equipe
// ============================================================

import { STATE, today, parseDate, fmtDate, todayISO } from './config.js';
import { pontoStatusBadge } from './ui.js';
import { abrirCheckin, abrirCheckinObra } from './ponto.js';

export function renderMembroDash(){
    const cont      = document.getElementById('membro-content');
    if(!cont) return;

    const liderId   = STATE.activeUser.vinculo;
    const minhasObras = STATE.obras.filter(o =>
        o.tasks?.some(t => t.forn===STATE.activeUser.id||t.forn===liderId)
    );

    const checkinHoje = [];
    STATE.obras.forEach(o =>
        (o.checkins||[]).forEach(c => {
            if(c.membroId===STATE.activeUser.id&&c.data===todayISO())
                checkinHoje.push({...c,obraNome:o.nome});
        })
    );
    const obrasComCheckinHoje = new Set(checkinHoje.map(c => c.obraId||''));

    const meusCi = [];
    STATE.obras.forEach(o => (o.checkins||[]).forEach(c => {
        if(c.membroId===STATE.activeUser.id) meusCi.push({...c,obraNome:o.nome,obraId:o.firebaseId});
    }));
    meusCi.sort((a,b) => b.data.localeCompare(a.data));

    const now = today();

    cont.innerHTML = `
        <div class="bg-arcco-black p-6 rounded-xl text-white relative overflow-hidden">
            <div class="absolute top-0 right-0 w-24 h-24 bg-arcco-lime/10 rounded-full -translate-y-6 translate-x-6"></div>
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bem-vindo,</p>
            <h3 class="font-montserrat font-black-italic text-3xl tracking-tighter mt-1">${STATE.activeUser.name}</h3>
            <p class="text-[10px] font-bold text-gray-400 uppercase mt-1">Equipe: ${STATE.activeUser.liderNome}</p>
        </div>
        ${checkinHoje.length > 0 ? `
        <div class="bg-arcco-lime/10 border border-arcco-lime/40 rounded-xl overflow-hidden">
            <div class="px-5 py-3 bg-arcco-lime/20 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <i data-lucide="check-circle-2" class="w-4 h-4 text-arcco-black"></i>
                    <span class="text-xs font-bold text-arcco-black uppercase">${checkinHoje.length} check-in(s) registrado(s) hoje</span>
                </div>
                <button onclick="APP.abrirCheckin()" class="text-[9px] font-bold text-arcco-black uppercase bg-arcco-lime px-3 py-1.5 rounded hover:brightness-95 flex items-center gap-1">
                    <i data-lucide="plus" class="w-3 h-3"></i> Outra Obra
                </button>
            </div>
            <div class="p-3 space-y-2">
                ${checkinHoje.map(ci => `
                <div class="bg-white rounded-lg border border-arcco-lime/30 px-4 py-3 flex justify-between items-center">
                    <div>
                        <p class="text-xs font-bold text-arcco-black uppercase">${ci.obraNome}</p>
                        <p class="text-[9px] font-bold text-gray-500 uppercase mt-0.5">${ci.horario} • ${ci.atividade}</p>
                    </div>
                    ${pontoStatusBadge(ci)}
                </div>`).join('')}
            </div>
        </div>` : `
        <button onclick="APP.abrirCheckin()" class="w-full bg-arcco-black text-white p-5 rounded-xl hover:bg-gray-900 transition-colors flex items-center justify-between group shadow-md">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-arcco-lime flex items-center justify-center shrink-0">
                    <i data-lucide="fingerprint" class="w-6 h-6 text-arcco-black"></i>
                </div>
                <div class="text-left">
                    <p class="font-montserrat font-bold text-sm uppercase">Registrar Presença</p>
                    <p class="text-[10px] font-bold text-gray-400 uppercase mt-0.5">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</p>
                </div>
            </div>
            <i data-lucide="chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-arcco-lime transition-colors"></i>
        </button>`}
        <div class="space-y-4">
            <h4 class="font-montserrat font-bold text-sm uppercase text-gray-400 tracking-wider">Serviços da Equipe</h4>
            ${minhasObras.length ? minhasObras.map(o => {
                const tasksLider = o.tasks.filter(t => t.forn===liderId||t.forn===STATE.activeUser.id);
                const pend       = tasksLider.filter(t => t.status!==2);
                const concl      = tasksLider.filter(t => t.status===2);
                const atrasadas  = pend.filter(t => t.fim&&parseDate(t.fim)<now);
                const jaFezCheckin = obrasComCheckinHoje.has(o.firebaseId);
                return `
                <div class="bg-white rounded-xl border ${atrasadas.length?'border-red-200':'border-gray-200'} shadow-sm overflow-hidden">
                    <div class="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                        <div>
                            <h5 class="font-montserrat font-bold text-sm uppercase text-arcco-black">${o.nome}</h5>
                            <p class="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Líder: ${STATE.activeUser.liderNome}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            ${atrasadas.length?`<span class="text-[8px] font-bold text-arcco-red bg-red-50 border border-red-200 px-2 py-1 rounded uppercase">${atrasadas.length} atrasado${atrasadas.length>1?'s':''}</span>`:''}
                            <span class="text-[8px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded uppercase">${concl.length}/${tasksLider.length} ok</span>
                            ${jaFezCheckin
                                ?`<span class="text-[8px] font-bold text-arcco-black bg-arcco-lime px-2 py-1 rounded uppercase flex items-center gap-1"><i data-lucide="check" class="w-2.5 h-2.5"></i> Presente</span>`
                                :`<button onclick="APP.abrirCheckinObra('${o.firebaseId}')" class="text-[8px] font-bold text-white bg-arcco-black px-2 py-1 rounded uppercase hover:bg-gray-800 flex items-center gap-1"><i data-lucide="fingerprint" class="w-2.5 h-2.5"></i> Check-in</button>`}
                        </div>
                    </div>
                    <div class="divide-y divide-gray-50">
                        ${tasksLider.map(t => {
                            const isLate    = t.status!==2&&t.fim&&parseDate(t.fim)<now;
                            const isBlocked = t.dep?.some(dId => { const dt=o.tasks.find(x=>x.id===dId); return dt&&dt.status!==2; });
                            return `
                            <div class="p-4 flex items-start gap-3 ${t.status===2?'opacity-40':''}">
                                <div class="mt-0.5 shrink-0">
                                    ${t.status===2
                                        ?`<div class="w-4 h-4 rounded-full bg-arcco-lime flex items-center justify-center"><i data-lucide="check" class="w-2.5 h-2.5 text-arcco-black"></i></div>`
                                        :isLate
                                            ?`<div class="w-4 h-4 rounded-full bg-arcco-red animate-pulse"></div>`
                                            :`<div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>`}
                                </div>
                                <div class="flex-1">
                                    <p class="text-xs font-bold text-arcco-black uppercase leading-tight">${t.nome}</p>
                                    <p class="text-[9px] font-bold text-gray-400 uppercase mt-1">${t.modulo}</p>
                                    <div class="flex flex-wrap gap-1 mt-1">
                                        ${t.fim?`<span class="text-[8px] font-bold ${isLate?'text-arcco-red bg-red-50 border-red-200':'text-gray-500 bg-gray-50 border-gray-200'} border px-1.5 py-0.5 rounded uppercase">Prazo: ${fmtDate(t.fim)}</span>`:''}
                                        ${isBlocked?`<span class="text-[8px] font-bold text-arcco-orange bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><i data-lucide="lock" class="w-2 h-2"></i>Bloqueado</span>`:''}
                                        ${t.status===2?`<span class="text-[8px] font-bold badge-pago px-1.5 py-0.5 rounded uppercase">Concluído</span>`:''}
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            }).join('') : '<div class="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm font-bold text-gray-400 uppercase">Nenhuma obra ativa na sua equipe no momento.</div>'}
        </div>
        ${meusCi.length ? `
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="bg-gray-50 border-b border-gray-200 px-5 py-3">
                <p class="text-xs font-bold text-arcco-black uppercase">Meu Histórico de Ponto</p>
            </div>
            <div class="divide-y divide-gray-100">
                ${meusCi.slice(0,30).map(ci => `
                <div class="px-5 py-3 flex justify-between items-center">
                    <div>
                        <p class="text-xs font-bold text-arcco-black">${fmtDate(ci.data)} <span class="text-gray-400 font-normal">• ${ci.horario}</span></p>
                        <p class="text-[9px] font-bold text-gray-500 uppercase mt-0.5">${ci.atividade} — ${ci.obraNome}</p>
                    </div>
                    ${pontoStatusBadge(ci)}
                </div>`).join('')}
            </div>
        </div>` : ''}`;
    lucide.createIcons();
}
