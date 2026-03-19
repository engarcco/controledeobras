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
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
};

export const showMasterSection = (sec) => {
    ['dash','obra-detail','fornecedores','clientes','composicoes', 'orcamentos'].forEach(s => {
        document.getElementById(`master-section-${s}`)?.classList.add('hidden');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active','border-arcco-lime','text-white'));
    document.getElementById(`master-section-${sec}`)?.classList.remove('hidden');
    lucide.createIcons();
};

window.openModal = openModal;
window.closeModal = closeModal;
window.showMasterSection = showMasterSection;
