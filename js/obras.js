export const calcBudgetValidation = () => {
    const custo = parseFloat(document.getElementById('task-custo-total').value) || 0;
    const bdi = parseFloat(document.getElementById('task-bdi').value) || 0;
    const venda = custo * (1 + bdi / 100);
    const dias = parseInt(document.getElementById('task-prazo').value) || 1;
    
    document.getElementById('task-venda-preview').innerText = fmtBRL(venda);

    // Validação de Diárias
    const leaderId = document.getElementById('task-fornecedor').value;
    if (!leaderId) return;

    const leader = STATE.forn.find(f => f.id === leaderId);
    let custoDiarias = parseFloat(leader.diaria || 0);

    // Soma diárias dos subordinados marcados
    document.querySelectorAll('.member-check:checked').forEach(input => {
        custoDiarias += parseFloat(input.dataset.diaria);
    });

    const custoTotalEquipe = custoDiarias * dias;
    const alertBox = document.getElementById('budget-alert');
    alertBox.classList.remove('hidden');

    if (custoTotalEquipe > custo) {
        alertBox.className = 'p-3 rounded-lg border bg-red-50 border-red-200 text-arcco-red flex items-center gap-3';
        alertBox.innerHTML = `<i data-lucide="alert-octagon"></i> <span class="text-xs font-bold uppercase">ESTOURO: Custo Equipe (${fmtBRL(custoTotalEquipe)}) maior que Custo Orçado (${fmtBRL(custo)})</span>`;
    } else {
        alertBox.className = 'p-3 rounded-lg border bg-green-50 border-green-200 text-green-700 flex items-center gap-3';
        alertBox.innerHTML = `<i data-lucide="check-circle"></i> <span class="text-xs font-bold uppercase">DENTRO DO ORÇAMENTO: Sobra ${fmtBRL(custo - custoTotalEquipe)}</span>`;
    }
    lucide.createIcons();
};
