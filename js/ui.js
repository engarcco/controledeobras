// ============================================================
// ui.js — Toast, Modal helpers, Navegação e Menus
// ============================================================

export const showToast = (msg) => {
    const t = document.getElementById('toast');
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
    btn.innerHTML = isOpen ? '<i data-lucide="menu" class="w-6 h-6"></i>' : '<i data-lucide="x" class="w-6 h-6"></i>';
    lucide.createIcons();
};

export const showMasterSection = (sec) => {
    // Adicionado 'orcamentos' na lista
    ['dash','obra-detail','fornecedores','clientes','composicoes', 'orcamentos'].forEach(s => {
        document.getElementById(`master-section-${s}`)?.classList.add('hidden');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active','border-arcco-lime','text-white'));
    
    // Mapeamento atualizado para incluir Orçamentos
    const map = {dash:'Obras', orcamentos:'Orçamentos', composicoes:'Composições', fornecedores:'Equipes', clientes:'Clientes'};
    const lbl = map[sec];
    
    Array.from(document.querySelectorAll('.nav-btn')).find(b=>b.innerText.trim()===lbl)?.classList.add('active','border-arcco-lime','text-white');

    document.getElementById(`master-section-${sec}`)?.classList.remove('hidden');
    lucide.createIcons();
};

export const switchObraTab = (tab) => {
    ['cronograma','curvas','medicoes','ponto','compras'].forEach(t => {
        document.getElementById(`obra-tab-${t}`)?.classList.add('hidden');
    });
    document.querySelectorAll('.obra-tab-btn').forEach(b => {
        b.classList.remove('active-tab','border-arcco-lime','text-arcco-black');
    });
    document.getElementById(`obra-tab-${tab}`)?.classList.remove('hidden');
    lucide.createIcons();
};

// Exportando para o escopo global para o index.html encontrar
window.toggleMobileMenu = toggleMobileMenu;
window.showMasterSection = showMasterSection;
window.switchObraTab = switchObraTab;
window.closeModal = closeModal;
