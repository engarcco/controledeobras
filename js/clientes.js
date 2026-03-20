// ============================================================
// portal-cliente.js — Portal do Cliente
// ============================================================

import { STATE, today, parseDate, fmtBRL, fmtDate } from './config.js';

export function renderClienteDash(){
    const cont = document.getElementById('cliente-content');
    const o    = STATE.obras.find(x => x.clienteId===STATE.activeUser.id);
    if(!o) return cont.innerHTML = '<div class="bg-white p-10 rounded-xl shadow-sm border border-gray-200 text-center"><h3 class="font-montserrat text-xl font-bold uppercase">PROJETO EM PREPARAÇÃO</h3><p class="text-sm text-gray-500 mt-2">Aguarde a liberação do cronograma pela Arcco Engenharia.</p></div>';

    const tasks      = o.tasks||[];
    const done       = tasks.filter(t => t.status===2);
    const total      = tasks.length||1;
    const pctFis     = Math.round(done.length/total*100);
    const compAprov  = (o.compras||[]).filter(c => c.status==='aprovado');
    const isAdm      = o.contrato==='ADMINISTRAÇÃO';
    const taxa       = parseFloat(o.taxa_adm)||0;
    const custoReal  = done.reduce((a,t) => a+(parseFloat(t.valor)||0),0)+(compAprov.reduce((a,c) => a+(parseFloat(c.valor)||0),0));
    const now        = today();

    let maxAtraso=0, etapaAtrasada='';
    tasks.forEach(t => {
        if(t.status!==2&&t.fim){
            const d = parseDate(t.fim);
            if(d<now){ const diff=Math.ceil((now-d)/86400000); if(diff>maxAtraso){ maxAtraso=diff; etapaAtrasada=t.nome; } }
        }
    });

    cont.innerHTML = `
        <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center mb-6 relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-arcco-black"></div>
            <div class="mt-2 mb-2 flex justify-center items-center gap-2">
                <span class="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase border">${o.tipo||'PROJETO'}</span>
                <span class="text-[9px] font-bold text-arcco-black bg-arcco-lime px-2 py-1 rounded uppercase">${o.contrato||'PREÇO FECHADO'}</span>
            </div>
            <h3 class="font-montserrat font-black-italic text-4xl uppercase tracking-tighter text-arcco-black mb-8">${o.nome}</h3>
            <div class="flex justify-center mb-8">
                <div class="relative w-48 h-48">
                    <canvas id="chart-cli-main"></canvas>
                    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span class="text-[10px] font-bold text-gray-400 uppercase -mb-1">Avanço Físico</span>
                        <span class="text-4xl font-montserrat font-black-italic">${pctFis}%</span>
                    </div>
                </div>
            </div>
            ${isAdm ? `
            <div class="grid grid-cols-2 gap-4 mt-6">
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center"><p class="text-[9px] font-bold uppercase text-gray-500">Custo Real</p><p class="font-montserrat font-bold text-xl mt-1">${fmtBRL(custoReal)}</p></div>
                <div class="bg-arcco-lime/20 p-4 rounded-lg border border-arcco-lime/50 text-center"><p class="text-[9px] font-bold uppercase text-gray-700">Taxa ADM (${taxa}%)</p><p class="font-montserrat font-bold text-xl mt-1">${fmtBRL(custoReal*taxa/100)}</p></div>
            </div>` : `
            <div class="grid grid-cols-2 gap-4 mt-6">
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                    <p class="text-[9px] font-bold uppercase text-gray-500">Valor do Contrato</p>
                    <p class="font-montserrat font-bold text-xl mt-1">${fmtBRL(Math.max(0, tasks.reduce((a,t)=>a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0) - (parseFloat(o.desconto)||0)))}</p>
                    ${(parseFloat(o.desconto)||0)>0?`<p class="text-[8px] font-bold text-arcco-orange uppercase mt-1"><i data-lucide="tag" class="inline w-3 h-3"></i> Desconto: ${fmtBRL(parseFloat(o.desconto))}</p>`:''}
                </div>
                <div class="bg-arcco-lime/20 p-4 rounded-lg border border-arcco-lime/50 text-center">
                    <p class="text-[9px] font-bold uppercase text-gray-700">Valor Executado</p>
                    <p class="font-montserrat font-bold text-xl mt-1">${fmtBRL((() => { const bruto = tasks.reduce((a,t)=>a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0); const desc = parseFloat(o.desconto)||0; const fator = bruto>0 ? Math.max(0,(bruto-desc)/bruto) : 1; return done.reduce((a,t)=>a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0)*fator; })())}</p>
                </div>
            </div>`}
        </div>
        ${maxAtraso > 0
            ? `<div class="bg-red-50 border border-red-200 p-5 rounded-xl mb-6 flex items-start gap-4 shadow-sm"><div class="bg-red-100 p-2 rounded-full text-arcco-red shrink-0"><i data-lucide="alert-triangle" class="w-5 h-5"></i></div><div><h4 class="text-xs font-bold text-red-800 uppercase mb-1">Alerta de Cronograma</h4><p class="text-xs text-red-700">~<strong>${maxAtraso} dias de atraso</strong> em [${etapaAtrasada}]. A equipe da Arcco já está atuando.</p></div></div>`
            : `<div class="bg-green-50 border border-green-200 p-5 rounded-xl mb-6 flex items-start gap-4 shadow-sm"><div class="bg-green-100 p-2 rounded-full text-green-600 shrink-0"><i data-lucide="check-circle-2" class="w-5 h-5"></i></div><div><h4 class="text-xs font-bold text-green-800 uppercase mb-1">Cronograma em Dia</h4><p class="text-xs text-green-700">Sua obra está dentro do prazo sem atrasos críticos.</p></div></div>`}
        <div class="space-y-4">
            <h4 class="font-montserrat font-bold text-sm uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2 mt-8"><i data-lucide="bar-chart-2" class="w-4 h-4 text-arcco-lime"></i> Avanço por Etapa</h4>
            ${[...new Set(tasks.map(t => t.modulo))].map(m => {
                const mt   = tasks.filter(t => t.modulo===m);
                const mpct = Math.round(mt.filter(t => t.status===2).length/mt.length*100);
                return `
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center relative overflow-hidden">
                    ${mpct===100?`<div class="absolute left-0 top-0 h-full w-1.5 bg-arcco-lime"></div>`:''}
                    <div class="w-full pr-8 pl-2">
                        <p class="text-xs font-bold text-arcco-black uppercase mb-3">${m}</p>
                        <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div class="h-full bg-arcco-lime" style="width:${mpct}%"></div>
                        </div>
                    </div>
                    <span class="font-montserrat font-black-italic text-2xl">${mpct}%</span>
                </div>`;
            }).join('')}
        </div>`;

    setTimeout(() => {
        const c = document.getElementById('chart-cli-main');
        if(c) new Chart(c,{type:'doughnut',data:{datasets:[{data:[done.length,total-done.length],backgroundColor:['#ccff00','#f4f4f5'],borderWidth:0}]},options:{maintainAspectRatio:false,cutout:'80%',plugins:{tooltip:{enabled:false}}}});
    }, 100);
    lucide.createIcons();
}
