// ============================================================
// ui.js — Toast, Modal helpers, Navegação e Menus
// ============================================================

export const showToast = (msg) => {
    const t = document.getElementById('toast');
    if(!t) return;
    document.getElementById('toast-text').innerText = msg;
    t.classList.remove('translate-x-[150%]');
    setTimeout(() => t.classList.add('translate-x-[150%]'), 3000);
};

export const openModal = (id) => {
    const el = document.getElementById(id);
    if(el){ el.classList.remove('hidden'); el.classList.add('flex'); }
};

export const closeModal = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.add('hidden');
        m.classList.remove('flex');
    });
};

export const toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu');
    const btn  = document.getElementById('mobile-menu-btn');
    if(!menu) return;
    const isOpen = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    btn.innerHTML = isOpen 
        ? '<i data-lucide="menu" class="w-6 h-6"></i>' 
        : '<i data-lucide="x" class="w-6 h-6"></i>';
    lucide.createIcons();
};

export const showMasterSection = (sec) => {
    // Lista de todas as seções possíveis
    const sections = ['dash','obra-detail','fornecedores','clientes','composicoes', 'orcamentos'];
    
    sections.forEach(s => {
        const el = document.getElementById(`master-section-${s}`);
        if(el) el.classList.add('hidden');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active','border-arcco-lime','text-white'));
    
    const map = {dash:'Obras', orcamentos:'Orçamentos', composicoes:'Composições', fornecedores:'Equipes', clientes:'Clientes'};
    const lbl = map[sec];
    
    Array.from(document.querySelectorAll('.nav-btn')).find(b=>b.innerText.trim()===lbl)?.classList.add('active','border-arcco-lime','text-white');

    const target = document.getElementById(`master-section-${sec}`);
    if(target) target.classList.remove('hidden');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};
};

export const switchObraTab = (tab) => {
    ['cronograma','curvas','medicoes','ponto','compras'].forEach(t => {
        const el = document.getElementById(`obra-tab-${t}`);
        if(el) el.classList.add('hidden');
    });
    document.querySelectorAll('.obra-tab-btn').forEach(b => {
        b.classList.remove('active-tab','border-arcco-lime','text-arcco-black');
    });
    const target = document.getElementById(`obra-tab-${tab}`);
    if(target) target.classList.remove('hidden');
    
    const btn = Array.from(document.querySelectorAll('.obra-tab-btn')).find(b => b.getAttribute('onclick')?.includes(`'${tab}'`));
    if(btn) btn.classList.add('active-tab','border-arcco-lime','text-arcco-black');
    
    lucide.createIcons();
};

// ESSENCIAL: Função que estava faltando e causou o erro
export const pontoStatusBadge = (ci) => {
    if(ci.statusMaster==='aprovado')
        return `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">Aprovado</span>`;
    if(ci.statusMaster==='recusado')
        return `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Recusado</span>`;
    return `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200">Pendente</span>`;
};

window.toggleMobileMenu = toggleMobileMenu;
window.showMasterSection = showMasterSection;
window.switchObraTab = switchObraTab;
window.closeModal = closeModal;
