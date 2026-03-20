// ============================================================
// portal-cliente.js — Portal do Cliente (redesenhado)
// Layout:
//   Nome da Obra + tags + info contrato
//   [Gráfico Físico] [Gráfico Financeiro]
//   Alerta cronograma
//   Avanço por Etapa: barras físico + financeiro lado a lado
// ============================================================

import { STATE, today, parseDate, fmtBRL, fmtDate } from './config.js';

export function renderClienteDash(){
    const cont = document.getElementById('cliente-content');
    const o    = STATE.obras.find(x => x.clienteId===STATE.activeUser.id);
    if(!o) return cont.innerHTML = `
        <div class="bg-white p-10 rounded-xl shadow-sm border border-gray-200 text-center">
            <h3 class="font-montserrat text-xl font-bold uppercase">PROJETO EM PREPARAÇÃO</h3>
            <p class="text-sm text-gray-500 mt-2">Aguarde a liberação do cronograma pela Arcco Engenharia.</p>
        </div>`;

    const tasks     = o.tasks||[];
    const done      = tasks.filter(t => t.status===2);
    const total     = tasks.length||1;
    const pctFis    = Math.round(done.length/total*100);
    const isAdm     = o.contrato==='ADMINISTRAÇÃO';
    const taxa      = parseFloat(o.taxa_adm)||0;
    const now       = today();

    // ── Valores do contrato ───────────────────────────────────
    const desconto      = parseFloat(o.desconto)||0;
    const entrada       = parseFloat(o.entrada)||0;
    const vendaBruta    = tasks.reduce((a,t) => a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
    const contratoFinal = Math.max(0, vendaBruta - desconto);

    // ── Avanço financeiro baseado nas medições recebidas ──────
    const medicoes      = o.medicoes||[];
    const totalMedicoesRecebidas = medicoes
        .filter(m => m.statusAdm==='recebido')
        .reduce((a,m) => a+(parseFloat(m.totalVenda)||parseFloat(m.custoMedido)||0), 0);
    const totalRecebido = totalMedicoesRecebidas + entrada;
    const pctFin = contratoFinal > 0
        ? Math.min(100, Math.round(totalRecebido / contratoFinal * 100))
        : 0;
    const saldoRestante = Math.max(0, contratoFinal - totalRecebido);

    // ── Atraso no cronograma ──────────────────────────────────
    let maxAtraso=0, etapaAtrasada='';
    tasks.forEach(t => {
        if(t.status!==2 && t.fim){
            const d = parseDate(t.fim);
            if(d < now){
                const diff = Math.ceil((now-d)/86400000);
                if(diff > maxAtraso){ maxAtraso=diff; etapaAtrasada=t.nome; }
            }
        }
    });

    // ── Status de medição para o cliente ────────────────────────
    // Regras:
    //   Sem medições pendentes               → "Medições em Dia"
    //   Tem medição pendente (não recebida)  → "Medição Pendente"
    //   Tem medição com vencimento vencido   → "Medição em Atraso"
    const medicoesPendentes = medicoes.filter(m => m.statusAdm !== 'recebido');
    const hoje = now; // já calculado acima
    let statusMedicao = 'em_dia'; // padrão
    if(medicoesPendentes.length > 0){
        // Verifica se alguma está vencida
        const vencida = medicoesPendentes.some(m => {
            if(!m.vencimento) return false;
            const venc = parseDate(m.vencimento);
            return venc && venc < hoje;
        });
        statusMedicao = vencida ? 'em_atraso' : 'pendente';
    }

    // ── Avanço financeiro por módulo ──────────────────────────
    const mods = [...new Set(tasks.map(t => t.modulo))];
    const fatorDesc = vendaBruta > 0 ? contratoFinal / vendaBruta : 1;

    const finPorModulo = {};
    mods.forEach(m => {
        const mTasks = tasks.filter(t => t.modulo===m);
        const contratadoMod = mTasks.reduce((a,t) =>
            a + (parseFloat(t.valor_venda)||parseFloat(t.valor)||0), 0) * fatorDesc;

        // Soma o que já foi recebido neste módulo via medições
        let recebidoMod = 0;
        medicoes.filter(med => med.statusAdm==='recebido').forEach(med => {
            (med.porLider||[]).forEach(l => {
                (l.servicos||[]).forEach(srv => {
                    const task = mTasks.find(t => t.id===srv.taskId);
                    if(task){
                        const vendaTask = (parseFloat(task.valor_venda)||parseFloat(task.valor)||0) * fatorDesc;
                        recebidoMod += vendaTask * ((srv.pct||0)/100);
                    }
                });
            });
        });

        finPorModulo[m] = {
            contratado: contratadoMod,
            recebido:   recebidoMod,
            pct:        contratadoMod > 0 ? Math.min(100, Math.round(recebidoMod/contratadoMod*100)) : 0
        };
    });

    // ── Render ────────────────────────────────────────────────
    cont.innerHTML = `

    <!-- ══ CABEÇALHO: NOME + INFO CONTRATO ══ -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5">
        <div class="h-2 bg-arcco-black w-full"></div>
        <div class="p-6">
            <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase border">${o.tipo||'PROJETO'}</span>
                <span class="text-[9px] font-bold text-arcco-black bg-arcco-lime px-2 py-1 rounded uppercase">${o.contrato||'PREÇO FECHADO'}</span>
            </div>
            <h3 class="font-montserrat font-black-italic text-3xl uppercase tracking-tighter text-arcco-black mt-2 mb-4">${o.nome}</h3>

            ${!isAdm ? `
            <!-- Linha de valores do contrato -->
            <div class="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold uppercase border-t border-gray-100 pt-4">
                <div>
                    <p class="text-gray-400 tracking-widest">Valor do Contrato</p>
                    <p class="font-montserrat font-bold text-lg text-arcco-black">${fmtBRL(contratoFinal)}</p>
                    ${desconto>0?`
                    <p class="text-[9px] font-bold text-arcco-black mt-0.5">Tabela: ${fmtBRL(vendaBruta)}</p>
                    <p class="text-[9px] font-bold text-arcco-orange">Desconto: ${fmtBRL(desconto)}</p>
                    `:''}
                </div>
                ${entrada>0?`
                <div>
                    <p class="text-gray-400 tracking-widest">Entrada Paga</p>
                    <p class="font-montserrat font-bold text-lg text-green-600">${fmtBRL(entrada)}</p>
                </div>`:''}
                <div>
                    <p class="text-gray-400 tracking-widest">Já Recebido</p>
                    <p class="font-montserrat font-bold text-lg text-arcco-black">${fmtBRL(totalRecebido)}</p>
                </div>
                <div>
                    <p class="text-gray-400 tracking-widest">Saldo a Pagar</p>
                    <p class="font-montserrat font-bold text-lg ${saldoRestante>0?'text-arcco-black':'text-green-600'}">${fmtBRL(saldoRestante)}</p>
                </div>
            </div>` : `
            <div class="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold uppercase border-t border-gray-100 pt-4">
                <div><p class="text-gray-400 tracking-widest">Custo Real</p><p class="font-montserrat font-bold text-lg text-arcco-black">${fmtBRL(done.reduce((a,t)=>a+(parseFloat(t.valor)||0),0))}</p></div>
                <div><p class="text-gray-400 tracking-widest">Taxa ADM (${taxa}%)</p><p class="font-montserrat font-bold text-lg text-arcco-black">${fmtBRL(done.reduce((a,t)=>a+(parseFloat(t.valor)||0),0)*taxa/100)}</p></div>
            </div>`}
        </div>
    </div>

    <!-- ══ DOIS GRÁFICOS LADO A LADO ══ -->
    <div class="grid grid-cols-2 gap-4 mb-5">
        <!-- Físico -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col items-center">
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Avanço Físico</p>
            <div class="relative w-28 h-28">
                <canvas id="chart-cli-fisico"></canvas>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span class="font-montserrat font-black-italic text-2xl text-arcco-black">${pctFis}%</span>
                </div>
            </div>
            <p class="text-[9px] font-bold text-gray-500 uppercase mt-3 text-center">${done.length}/${total} serviços</p>
        </div>
        <!-- Financeiro -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col items-center">
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Avanço Financeiro</p>
            <div class="relative w-28 h-28">
                <canvas id="chart-cli-financeiro"></canvas>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span class="font-montserrat font-black-italic text-2xl text-arcco-black">${pctFin}%</span>
                </div>
            </div>
            <p class="text-[9px] font-bold text-gray-500 uppercase mt-3 text-center">${fmtBRL(totalRecebido)} pago</p>
        </div>
    </div>

    <!-- ══ EXTRATO DE PAGAMENTOS ══ -->
    ${(entrada > 0 || medicoes.filter(m=>m.statusAdm==='recebido').length > 0) ? `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5">
        <div class="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <p class="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <i data-lucide="receipt" class="w-3 h-3 text-arcco-lime"></i> Histórico de Pagamentos
            </p>
        </div>
        <div class="divide-y divide-gray-100">
            ${entrada > 0 ? `
            <div class="px-5 py-3 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                    <div>
                        <p class="text-[10px] font-bold text-arcco-black uppercase">Entrada / Sinal</p>
                        ${o.entradaEm ? `<p class="text-[8px] font-bold text-gray-400 uppercase">${o.entradaEm.split('-').reverse().join('/')}</p>` : ''}
                    </div>
                </div>
                <span class="font-montserrat font-bold text-sm text-green-600">${fmtBRL(entrada)}</span>
            </div>` : ''}
            ${medicoes.filter(m=>m.statusAdm==='recebido').sort((a,b)=>(a.inicio||'').localeCompare(b.inicio||'')).map(m => `
            <div class="px-5 py-3 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-arcco-lime shrink-0"></div>
                    <div>
                        <p class="text-[10px] font-bold text-arcco-black uppercase">Medição</p>
                        <p class="text-[8px] font-bold text-gray-400 uppercase">${m.inicio?m.inicio.split('-').reverse().join('/'):''} ${m.fim?' → '+m.fim.split('-').reverse().join('/'):''}</p>
                    </div>
                </div>
                <span class="font-montserrat font-bold text-sm text-arcco-black">${fmtBRL(parseFloat(m.totalVenda)||parseFloat(m.custoMedido)||0)}</span>
            </div>`).join('')}
            <!-- Total -->
            <div class="px-5 py-3 flex justify-between items-center bg-gray-50">
                <p class="text-[10px] font-bold text-arcco-black uppercase">Total Recebido</p>
                <span class="font-montserrat font-bold text-base text-arcco-black">${fmtBRL(totalRecebido)}</span>
            </div>
            <div class="px-5 py-3 flex justify-between items-center">
                <p class="text-[10px] font-bold text-gray-500 uppercase">Saldo a Pagar</p>
                <span class="font-montserrat font-bold text-base ${saldoRestante>0?'text-arcco-black':'text-green-600'}">${fmtBRL(saldoRestante)}</span>
            </div>
        </div>
    </div>` : ''}

    <!-- ══ STATUS CRONOGRAMA + MEDIÇÃO LADO A LADO ══ -->
    <div class="grid grid-cols-2 gap-4 mb-5">
        <!-- Cronograma -->
        ${maxAtraso > 0
            ? `<div class="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <div class="bg-red-100 p-2 rounded-full text-arcco-red shrink-0 mt-0.5"><i data-lucide="alert-triangle" class="w-4 h-4"></i></div>
                <div><h4 class="text-[10px] font-bold text-red-800 uppercase mb-0.5">Cronograma</h4>
                <p class="text-[10px] font-bold text-red-700">~${maxAtraso} dias de atraso</p>
                <p class="text-[9px] text-red-600">${etapaAtrasada}</p></div>
               </div>`
            : `<div class="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <div class="bg-green-100 p-2 rounded-full text-green-600 shrink-0 mt-0.5"><i data-lucide="check-circle-2" class="w-4 h-4"></i></div>
                <div><h4 class="text-[10px] font-bold text-green-800 uppercase mb-0.5">Cronograma</h4>
                <p class="text-[10px] font-bold text-green-700">Em dia</p>
                <p class="text-[9px] text-green-600">Sem atrasos críticos</p></div>
               </div>`}
        <!-- Status Medição -->
        ${statusMedicao === 'em_atraso'
            ? `<div class="bg-red-50 border-2 border-red-400 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <div class="bg-red-100 p-2 rounded-full text-arcco-red shrink-0 mt-0.5"><i data-lucide="clock-alert" class="w-4 h-4"></i></div>
                <div><h4 class="text-[10px] font-bold text-red-800 uppercase mb-0.5">Medição</h4>
                <p class="text-[10px] font-bold text-red-700">Em Atraso</p>
                <p class="text-[9px] text-red-600">Pagamento vencido</p></div>
               </div>`
            : statusMedicao === 'pendente'
            ? `<div class="bg-orange-50 border-2 border-arcco-orange p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <div class="bg-orange-100 p-2 rounded-full text-arcco-orange shrink-0 mt-0.5"><i data-lucide="clock" class="w-4 h-4"></i></div>
                <div><h4 class="text-[10px] font-bold text-orange-800 uppercase mb-0.5">Medição</h4>
                <p class="text-[10px] font-bold text-arcco-orange">Pendente</p>
                <p class="text-[9px] text-orange-600">Aguardando pagamento</p></div>
               </div>`
            : `<div class="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <div class="bg-green-100 p-2 rounded-full text-green-600 shrink-0 mt-0.5"><i data-lucide="check-circle-2" class="w-4 h-4"></i></div>
                <div><h4 class="text-[10px] font-bold text-green-800 uppercase mb-0.5">Medição</h4>
                <p class="text-[10px] font-bold text-green-700">Em dia</p>
                <p class="text-[9px] text-green-600">Tudo quitado</p></div>
               </div>`}
    </div>

    <!-- ══ AVANÇO POR ETAPA (físico + financeiro) ══ -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="bg-gray-50 border-b border-gray-200 px-5 py-3 grid grid-cols-2 gap-4">
            <p class="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <i data-lucide="hard-hat" class="w-3 h-3"></i> Avanço Físico
            </p>
            <p class="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <i data-lucide="trending-up" class="w-3 h-3 text-arcco-lime"></i> Avanço Financeiro
            </p>
        </div>
        <div class="divide-y divide-gray-100">
            ${mods.map(m => {
                const mt   = tasks.filter(t => t.modulo===m);
                const mpct = Math.round(mt.filter(t=>t.status===2).length / mt.length * 100);
                const fin  = finPorModulo[m] || {pct:0, recebido:0, contratado:0};
                return `
                <div class="px-5 py-4">
                    <p class="text-[10px] font-bold text-arcco-black uppercase mb-3">${m}</p>
                    <div class="grid grid-cols-2 gap-4">
                        <!-- Barra física -->
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-[9px] font-bold text-gray-400 uppercase">${mt.filter(t=>t.status===2).length}/${mt.length}</span>
                                <span class="font-montserrat font-bold text-xs ${mpct===100?'text-green-600':'text-arcco-black'}">${mpct}%</span>
                            </div>
                            <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500 ${mpct===100?'bg-arcco-lime':'bg-arcco-black'}"
                                     style="width:${mpct}%"></div>
                            </div>
                        </div>
                        <!-- Barra financeira -->
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-[9px] font-bold text-gray-400 uppercase">${fmtBRL(fin.recebido)}</span>
                                <span class="font-montserrat font-bold text-xs ${fin.pct===100?'text-green-600':'text-arcco-black'}">${fin.pct}%</span>
                            </div>
                            <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500 ${fin.pct===100?'bg-green-500':'bg-arcco-lime'}"
                                     style="width:${fin.pct}%"></div>
                            </div>
                            ${fin.contratado>0?`<p class="text-[8px] text-gray-400 font-bold mt-1">de ${fmtBRL(fin.contratado)}</p>`:''}
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`;

    // Gráficos donut — físico escuro, financeiro verde
    setTimeout(() => {
        const ctxFis = document.getElementById('chart-cli-fisico');
        if(ctxFis) new Chart(ctxFis, {
            type: 'doughnut',
            data: { datasets: [{ data: [pctFis, 100-pctFis], backgroundColor: ['#111111','#f4f4f5'], borderWidth: 0 }] },
            options: { maintainAspectRatio: false, cutout: '76%', plugins: { tooltip: { enabled: false } } }
        });
        const ctxFin = document.getElementById('chart-cli-financeiro');
        if(ctxFin) new Chart(ctxFin, {
            type: 'doughnut',
            data: { datasets: [{ data: [pctFin, 100-pctFin], backgroundColor: ['#ccff00','#f4f4f5'], borderWidth: 0 }] },
            options: { maintainAspectRatio: false, cutout: '76%', plugins: { tooltip: { enabled: false } } }
        });
    }, 100);

    lucide.createIcons();
}
