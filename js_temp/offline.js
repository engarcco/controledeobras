// ============================================================
// offline.js — Sincronização offline (Fila de ponto no localStorage)
// ============================================================

/**
 * Guarda um check-in no localStorage quando não há internet.
 * @param {Object} dados - Dados do check-in a salvar
 */
export function salvarOffline(dados) {
    let fila = JSON.parse(localStorage.getItem('fila_ponto') || '[]');
    fila.push({
        ...dados,
        registro_offline: true,
        data_registro_original: new Date().toISOString()
    });
    localStorage.setItem('fila_ponto', JSON.stringify(fila));
    if (window.APP?.showToast) {
        window.APP.showToast('Sem internet! Ponto guardado no celular.');
    }
}

/**
 * Envia os check-ins guardados offline quando a internet volta.
 * Depende de window.APP._saveCheckinOnline (injetado pelo main.js).
 */
export async function sincronizarDados() {
    if (!navigator.onLine) return;
    const fila = JSON.parse(localStorage.getItem('fila_ponto') || '[]');
    if (!fila.length) return;

    console.log('Sincronizando dados offline...');
    for (const ponto of fila) {
        try {
            await window.APP._saveCheckinOnline(ponto);
        } catch (e) {
            console.error('Erro ao subir dado offline:', e);
            return; // aborta e tenta na próxima conexão
        }
    }
    localStorage.removeItem('fila_ponto');
    if (window.APP?.showToast) {
        window.APP.showToast('Sincronizado! Dados da obra atualizados.');
    }
}

/**
 * Registra os listeners de online/offline e inicializa a sincronização.
 * Chame esta função uma vez, no main.js.
 */
export function initOfflineListeners() {
    window.addEventListener('online', () => {
        const banner = document.getElementById('offline-banner');
        if (banner) banner.classList.add('hidden');
        sincronizarDados();
    });

    window.addEventListener('offline', () => {
        const banner = document.getElementById('offline-banner');
        if (banner) banner.classList.remove('hidden');
    });
}
