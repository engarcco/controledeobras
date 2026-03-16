// ============================================================
// curvas.js — Curva S, Curva ABC e Orçamento Analítico
// ============================================================

import { STATE, fmtBRL, fmtDate, parseDate, today, MOD_COLORS } from './config.js';

let chartCurvaS = null, chartCustoMod = null, chartCurvaABC = null;

// ── Sub-tab switcher ──────────────────────────────────────────
export const switchCurvaTab = (sub) => {
    ['s','abc','orcamento'].forEach(t => {
        document.getElementById(`curva-tab-${t}`)?.classList.add('hidden');
    });
    document.querySelectorAll('.curva-sub-btn').forEach(b => {
        b.classList.remove('border-arcco-lime','text-arcco-black');
        b.classList.add('border-transparent','text-gray-400');
    });
    document.getElementById(`curva-tab-${sub}`)?.classList.remove('hidden');
    const map = {s:'btn-curva-s', abc:'btn-curva-abc', orcamento:'btn-curva-orc'};
    const btn = document.getElementById(map[sub]);
    if(btn){ btn.classList.add('border-arcco-lime','text-arcco-black'); btn.classList.remove('border-transparent','text-gray-400'); }

    if(sub==='s')         renderCurvaS();
    if(sub==='abc')       renderCurvaABC();
    if(sub==='orcamento') renderOrcamentoAnalitico();
};

export const renderCurvas = () => {};  // bootstrap — sub-tabs cuidam dos charts

// ── Curva S ───────────────────────────────────────────────────
export function renderCurvaS(){
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;
    const tasks = o.tasks||[];
    const now   = today();

    const total      = tasks.length;
    const done       = tasks.filter(t => t.status===2).length;
    const pct        = total ? Math.round(done/total*100) : 0;
    const totalCusto = tasks.reduce((a,t) => a+(parseFloat(t.valor)||0),0);
    const custoConcl = tasks.filter(t => t.status===2).reduce((a,t) => a+(parseFloat(t.valor)||0),0);
    const atrasadas  = tasks.filter(t => t.status!==2&&t.fim&&parseDate(t.fim)<now).length;
    const prazoGeral = tasks.reduce((max,t) => { const d=parseDate(t.fim); return d&&d>max?d:max; }, new Date(2000,0,1));

    document.getElementById('curva-s-cards').innerHTML = `
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Avanço Físico</p>
            <p class="font-montserrat font-black-italic text-4xl text-arcco-black mt-1">${pct}%</p>
            <p class="text-[9px] font-bold text-gray-400 uppercase mt-1">${done} de ${total} serviços</p>
            <div class="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden"><div class="h-full bg-arcco-lime" style="width:${pct}%"></div></div>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Avanço Financeiro</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(custoConcl)}</p>
            <p class="text-[9px] font-bold text-gray-400 uppercase mt-1">de ${fmtBRL(totalCusto)} total</p>
            <p class="text-[9px] font-bold text-arcco-lime mt-1">${totalCusto>0?Math.round(custoConcl/totalCusto*100):0}% executado financeiramente</p>
        </div>
        <div class="bg-white border ${atrasadas>0?'border-red-300':'border-gray-200'} rounded-xl p-5 shadow-sm">
            <p class="text-[9px] font-bold ${atrasadas>0?'text-arcco-red':'text-gray-400'} uppercase tracking-wider">${atrasadas>0?'⚠ Itens em Atraso':'Status do Prazo'}</p>
            <p class="font-montserrat font-black-italic text-4xl ${atrasadas>0?'text-arcco-red':'text-arcco-black'} mt-1">${atrasadas}</p>
            <p class="text-[9px] font-bold text-gray-400 uppercase mt-1">${atrasadas>0?'serviço(s) atrasado(s)':'sem atrasos'}</p>
            <p class="text-[9px] font-bold text-gray-500 mt-1">Prazo geral: ${prazoGeral>new Date(2000,0,1)?fmtDate(prazoGeral.toISOString().split('T')[0]):'—'}</p>
        </div>`;

    const mods = [...new Set(tasks.map(t => t.modulo))];

    if(chartCurvaS) chartCurvaS.destroy();
    const ctx = document.getElementById('chart-curva-s');
    if(ctx) chartCurvaS = new Chart(ctx, {
        type: 'bar',
        data: { labels: mods, datasets: [
            { label:'Previsto (%)', data:mods.map(()=>100), backgroundColor:'#e5e7eb', borderRadius:4, barThickness:24 },
            { label:'Executado (%)', data:mods.map(m => { const mt=tasks.filter(t=>t.modulo===m); return mt.length?Math.round(mt.filter(t=>t.status===2).length/mt.length*100):0; }), backgroundColor:'#ccff00', borderRadius:4, barThickness:24 }
        ]},
        options:{ responsive:true, maintainAspectRatio:false, scales:{ x:{grid:{display:false}}, y:{max:100,ticks:{callback:v=>v+'%'}} }, plugins:{ legend:{display:true,position:'top'} } }
    });

    const custoMods = mods.map(m => tasks.filter(t => t.modulo===m).reduce((a,t) => a+(parseFloat(t.valor)||0),0));
    if(chartCustoMod) chartCustoMod.destroy();
    const ctx2 = document.getElementById('chart-custo-modulo');
    if(ctx2) chartCustoMod = new Chart(ctx2, {
        type:'doughnut',
        data:{ labels:mods, datasets:[{ data:custoMods, backgroundColor:MOD_COLORS.slice(0,mods.length), borderWidth:2, borderColor:'#fff' }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ font:{size:10}, boxWidth:12 } }, tooltip:{ callbacks:{ label:ctx=>` ${ctx.label}: ${fmtBRL(ctx.raw)}` } } } }
    });
    lucide.createIcons();
}

// ── Curva ABC ─────────────────────────────────────────────────
export function renderCurvaABC(){
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;
    const tasks = [...(o.tasks||[])].filter(t => parseFloat(t.valor)>0);
    tasks.sort((a,b) => (parseFloat(b.valor)||0)-(parseFloat(a.valor)||0));
    const totalCusto = tasks.reduce((a,t) => a+(parseFloat(t.valor)||0),0);

    let acum = 0;
    const classified = tasks.map(t => {
        acum += parseFloat(t.valor)||0;
        const pct = totalCusto>0?acum/totalCusto*100:0;
        const cls = pct<=80?'A':pct<=95?'B':'C';
        return {...t,pctAcum:pct,cls};
    });

    if(chartCurvaABC) chartCurvaABC.destroy();
    const ctx = document.getElementById('chart-curva-abc');
    if(ctx) chartCurvaABC = new Chart(ctx, {
        type:'bar',
        data:{
            labels: classified.map((_,i) => i+1),
            datasets:[
                { type:'bar', label:'Custo Individual', data:classified.map(t=>parseFloat(t.valor)||0),
                  backgroundColor: classified.map(t => t.cls==='A'?'#ccff00':t.cls==='B'?'#f97316':'#d1d5db'),
                  borderRadius:3, yAxisID:'y' },
                { type:'line', label:'% Acumulado', data:classified.map(t => t.pctAcum),
                  borderColor:'#111111', borderWidth:2, pointRadius:0, fill:false, yAxisID:'y1' }
            ]
        },
        options:{ responsive:true, maintainAspectRatio:false,
            scales:{ y:{ticks:{callback:v=>fmtBRL(v)},grid:{display:false}}, y1:{position:'right',max:100,ticks:{callback:v=>v+'%'},grid:{display:false}} },
            plugins:{ legend:{position:'top'} }
        }
    });

    const tabela = document.getElementById('tabela-abc');
    if(tabela) tabela.innerHTML = `
        <table class="w-full text-[10px]">
            <thead><tr class="bg-gray-50 text-gray-500 uppercase font-bold">
                <th class="px-3 py-2 text-left w-8">#</th>
                <th class="px-3 py-2 text-left">Serviço</th>
                <th class="px-3 py-2 text-left">Módulo</th>
                <th class="px-3 py-2 text-right">Custo</th>
                <th class="px-3 py-2 text-right">% Total</th>
                <th class="px-3 py-2 text-right">% Acum.</th>
                <th class="px-3 py-2 text-center">Classe</th>
            </tr></thead>
            <tbody class="divide-y divide-gray-100">
                ${classified.map((t,i) => `
                <tr class="hover:bg-gray-50">
                    <td class="px-3 py-2 text-gray-400 font-bold">${i+1}</td>
                    <td class="px-3 py-2 font-bold text-arcco-black max-w-[200px] truncate">${t.nome}</td>
                    <td class="px-3 py-2 text-gray-500">${t.modulo}</td>
                    <td class="px-3 py-2 text-right font-bold">${fmtBRL(t.valor)}</td>
                    <td class="px-3 py-2 text-right">${(parseFloat(t.valor)/totalCusto*100).toFixed(1)}%</td>
                    <td class="px-3 py-2 text-right">${t.pctAcum.toFixed(1)}%</td>
                    <td class="px-3 py-2 text-center">
                        <span class="font-bold px-2 py-0.5 rounded text-[9px] ${t.cls==='A'?'bg-arcco-lime text-arcco-black':t.cls==='B'?'bg-orange-100 text-orange-700':'bg-gray-100 text-gray-600'}">${t.cls}</span>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    lucide.createIcons();
}

// ── Orçamento Analítico ───────────────────────────────────────
export function renderOrcamentoAnalitico(){
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;
    const tasks = o.tasks||[];
    const mods  = [...new Set(tasks.map(t => t.modulo))];
    let totalMO=0,totalMat=0,totalEq=0,totalOu=0,totalCD=0,totalVenda=0;
    let rowIdx = 1;

    const tabela = document.getElementById('tabela-orcamento');
    if(!tabela) return;

    tabela.innerHTML = mods.map(m => {
        const mTasks   = tasks.filter(t => t.modulo===m);
        const subMO    = mTasks.reduce((a,t) => a+(parseFloat(t.valor_mo)||0),0);
        const subMat   = mTasks.reduce((a,t) => a+(parseFloat(t.valor_mat)||0),0);
        const subEq    = mTasks.reduce((a,t) => a+(parseFloat(t.valor_eq)||0),0);
        const subOu    = mTasks.reduce((a,t) => a+(parseFloat(t.valor_ou)||0),0);
        const subCD    = mTasks.reduce((a,t) => a+(parseFloat(t.valor)||0),0);
        const subVenda = mTasks.reduce((a,t) => a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
        totalMO+=subMO; totalMat+=subMat; totalEq+=subEq; totalOu+=subOu; totalCD+=subCD; totalVenda+=subVenda;

        const rows = mTasks.map(t => {
            const isEmpreita = t.tipo_contratacao==='empreita';
            const bdi = t.taxa_pct||t.bdi||0;
            return `
            <div class="px-5 py-3 grid grid-cols-12 gap-2 hover:bg-gray-50 text-[10px]">
                <div class="col-span-1 text-gray-400 font-bold">${rowIdx++}</div>
                <div class="col-span-4">
                    <p class="font-bold text-arcco-black uppercase leading-tight">${t.nome}</p>
                    ${isEmpreita?`<span class="text-[8px] font-bold text-arcco-orange bg-orange-50 border border-orange-200 px-1 py-0.5 rounded uppercase">Empreita</span>`:''}
                    ${t.status===2?`<span class="text-[8px] font-bold badge-pago px-1 py-0.5 rounded uppercase ml-1">Concluído</span>`:''}
                </div>
                <div class="col-span-1 text-right text-gray-600">${(parseFloat(t.valor_mo)||0)>0?fmtBRL(t.valor_mo):'—'}</div>
                <div class="col-span-1 text-right text-gray-600">${(parseFloat(t.valor_mat)||0)>0?fmtBRL(t.valor_mat):'—'}</div>
                <div class="col-span-1 text-right text-gray-600">${(parseFloat(t.valor_eq)||0)>0?fmtBRL(t.valor_eq):'—'}</div>
                <div class="col-span-1 text-right text-gray-600">${(parseFloat(t.valor_ou)||0)>0?fmtBRL(t.valor_ou):'—'}</div>
                <div class="col-span-1 text-right font-bold text-arcco-black">${fmtBRL(t.valor)}</div>
                <div class="col-span-1 text-right text-gray-500">${bdi>0?bdi+'%':'—'}</div>
                <div class="col-span-1 text-right font-bold text-arcco-black">${fmtBRL(t.valor_venda||t.valor)}</div>
            </div>`;
        }).join('');

        return `
        <div class="bg-gray-100 border-b border-t border-gray-200 px-5 py-2.5 grid grid-cols-12 gap-2">
            <div class="col-span-5 font-montserrat font-bold text-xs uppercase text-arcco-black">${m}</div>
            <div class="col-span-1 text-right text-[10px] font-bold text-gray-600">${fmtBRL(subMO)}</div>
            <div class="col-span-1 text-right text-[10px] font-bold text-gray-600">${fmtBRL(subMat)}</div>
            <div class="col-span-1 text-right text-[10px] font-bold text-gray-600">${fmtBRL(subEq)}</div>
            <div class="col-span-1 text-right text-[10px] font-bold text-gray-600">${fmtBRL(subOu)}</div>
            <div class="col-span-1 text-right text-[10px] font-bold text-arcco-black">${fmtBRL(subCD)}</div>
            <div class="col-span-1 text-right text-[10px] text-gray-400">—</div>
            <div class="col-span-1 text-right text-[10px] font-bold text-arcco-black">${fmtBRL(subVenda)}</div>
        </div>
        ${rows}`;
    }).join('');

    const tot = document.getElementById('tabela-orcamento-total');
    if(tot) tot.innerHTML = `
        <div class="col-span-5 font-montserrat font-bold text-xs uppercase text-arcco-black">TOTAL GERAL</div>
        <div class="col-span-1 text-right text-[10px] font-bold">${fmtBRL(totalMO)}</div>
        <div class="col-span-1 text-right text-[10px] font-bold">${fmtBRL(totalMat)}</div>
        <div class="col-span-1 text-right text-[10px] font-bold">${fmtBRL(totalEq)}</div>
        <div class="col-span-1 text-right text-[10px] font-bold">${fmtBRL(totalOu)}</div>
        <div class="col-span-1 text-right text-[10px] font-bold text-arcco-black">${fmtBRL(totalCD)}</div>
        <div class="col-span-1 text-right text-[10px] text-gray-400">—</div>
        <div class="col-span-1 text-right text-[10px] font-bold text-arcco-black">${fmtBRL(totalVenda)}</div>`;
    lucide.createIcons();
}
