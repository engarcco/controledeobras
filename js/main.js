// ============================================================
// main.js — Ponto de entrada do ARCCO HUB
// Importa todos os módulos e monta o objeto global window.APP
// ============================================================

// ── Config / State / Helpers ─────────────────────────────────
import { STATE } from './config.js';

// ── UI ────────────────────────────────────────────────────────
import { showToast, openModal, closeModal,
         toggleMobileMenu, showMasterSection,
         pontoStatusBadge, switchObraTab, switchFornTab } from './ui.js';

// ── Auth + Sync ───────────────────────────────────────────────
import { setupAuth } from './auth.js';

// ── Obras / Cronograma ────────────────────────────────────────
import { renderMasterObrasGrid, openObraDetail,
         // CORREÇÃO 1: novas funções de duplicar com modal
         abrirModalDuplicar, confirmarDuplicar, duplicarObra,
         abrirModalEditarObra, salvarEdicaoObra,
         finalizarObra, confirmarFinalizarObra,
         renderObrasFinalizadasGrid, reativarObra,
         renderHistoricoIntelligence,
         deleteObraCompleta, renderObraDetail,
         // CORREÇÃO 2: novo formulário simplificado
         calcTotalTask, toggleDetalhamento,
         // CORREÇÃO 3: carregamento de subordinados
         onChangeFornecedor, onChangeMembros,
         setTipoContratacao, calcPERT,
         updateInicioStyle, handleDepChange,
         saveTaskToObra, editTask, resetTaskForm,
         toggleTaskStatus, deleteTask, toggleAtencao,
         saveModuloObra, editModuloObra, cancelEditModulo, deleteModuloObra,
         saveNovaObra, updateObraConfig, saveHorarioObra, onToggleNoturno,
         calcFimPorDuracao, calcDuracaoPorFim,
         openModalNovaCompra, saveNovaCompra, aprovarCompra, deleteCompra,
         _toggleTaxaMat } from './obras.js';

// ── Medições ─────────────────────────────────────────────────
import { renderMedicoes, openModalNovaMedicao, calcMedicaoTotal,
         saveMedicao, toggleStatusAdm, deleteMedicao, _limitarPct, editarMedicao,
         saveEntrada, removerEntrada,
         openModalNovaDiaria, calcDiaria, saveDiaria, deleteDiaria } from './medicoes.js';

// ── Curvas ────────────────────────────────────────────────────
import { switchCurvaTab, renderCurvaS,
         renderCurvaABC, renderOrcamentoAnalitico } from './curvas.js';

// ── Folha de Ponto ────────────────────────────────────────────
import { renderMasterPonto, aprovarCheckin, deleteCheckin,
         renderFornPontoLider, liderAprovarCheckin,
         abrirCheckin, abrirCheckinObra, _toggleCheckinObraRow,
         saveCheckin as _saveCheckinCore } from './ponto.js';

// ── Fornecedores ──────────────────────────────────────────────
import { renderFornAdmin, toggleLiderSelect,
         openModalManualForn, editForn, saveManualForn,
         submitRegForn, deleteForn, populaSelectManualForn } from './fornecedores.js';

// ── Clientes ─────────────────────────────────────────────────
import { renderClientsList, openModalNovoCliente, editClient,
         saveNovoCliente, deleteClient, populaSelectClientes } from './clientes.js';

// ── Gestores ──────────────────────────────────────────────────
import { openModalGestores, renderListaGestores,
         saveNovoGestor, deleteGestor } from './gestores.js';

// ── Composições ───────────────────────────────────────────────
import { renderComposicoesList, openModalComposicao, editComposicao,
         saveComposicao, deleteComposicao,
         populaSelectComposicoes, aplicarComposicao } from './composicoes.js';

// ── Portais ───────────────────────────────────────────────────
import { renderFornDash, renderFornChecklist, fornToggleStatus } from './portal-forn.js';
import { renderMembroDash }    from './portal-membro.js';
import { renderClienteDash }   from './portal-cliente.js';

// ── Offline ───────────────────────────────────────────────────
import { salvarOffline, sincronizarDados, initOfflineListeners } from './offline.js';

// ── Notificações Push (desativado — será ativado na Etapa 2) ───
// import { initNotifications, ... } from './notifications.js';
const initNotifications         = () => {};
const notificarServicoConcluido = () => {};
const notificarCheckin          = () => {};
const notificarAtraso           = () => {};
const notificarGargalo          = () => {};
const notificarCheckinPendente  = () => {};

// ═══════════════════════════════════════════════════════════════
// Monta window.APP — objeto público consumido pelo HTML inline
// ═══════════════════════════════════════════════════════════════
window.APP = {
    // UI / Modal
    openModal,
    closeModal,
    showToast,

    // Obras
    openObraDetail,
    abrirModalDuplicar,
    confirmarDuplicar,
    duplicarObra: abrirModalDuplicar,
    // Editar / Finalizar / Histórico
    abrirModalEditarObra,
    salvarEdicaoObra,
    finalizarObra,
    confirmarFinalizarObra,
    renderObrasFinalizadasGrid,
    reativarObra,
    renderHistoricoIntelligence,
    deleteObraCompleta,
    updateObraConfig,
    saveNovaObra,

    // CORREÇÃO 2: Formulário simplificado
    calcTotalTask,
    toggleDetalhamento,

    // CORREÇÃO 3: Subordinados por checkbox
    onChangeFornecedor,
    onChangeMembros,

    // Formulário de Tarefa (mantidos por compatibilidade)
    setTipoContratacao,
    calcPERT,
    updateInicioStyle,
    handleDepChange,
    saveTaskToObra,
    editTask,
    resetTaskForm,
    toggleTaskStatus,
    deleteTask,
    toggleAtencao,

    // Módulos EAP
    saveModuloObra,
    editModuloObra,
    cancelEditModulo,
    deleteModuloObra,

    // Compras
    openModalNovaCompra,
    saveNovaCompra,
    aprovarCompra,
    saveHorarioObra,
    onToggleNoturno,
    calcFimPorDuracao,
    calcDuracaoPorFim,
    deleteCompra,

    // Medições
    openModalNovaMedicao,
    calcMedicaoTotal,
    saveMedicao,
    toggleStatusAdm,
    deleteMedicao,
    _limitarPct,
    editarMedicao,
    saveEntrada,
    removerEntrada,

    // Diárias
    openModalNovaDiaria,
    calcDiaria,
    saveDiaria,
    deleteDiaria,

    // Curvas S / ABC / Orçamento
    switchCurvaTab,
    renderCurvaS,
    renderCurvaABC,
    renderOrcamentoAnalitico,

    // Folha de Ponto — Master
    renderMasterPonto,
    aprovarCheckin,
    deleteCheckin,

    // Folha de Ponto — Líder / Membro
    renderFornPontoLider,
    liderAprovarCheckin,
    switchFornTab,
    abrirCheckin,
    abrirCheckinObra,
    _toggleCheckinObraRow,

    // saveCheckin com wrapper offline
    saveCheckin: async function (dados, isSync = false) {
        if (!navigator.onLine && !isSync) {
            salvarOffline(dados);
            return;
        }
        return _saveCheckinCore(dados);
    },

    // Usado pelo offline.js na re-sincronização
    _saveCheckinOnline: _saveCheckinCore,

    // Portal Fornecedor
    renderFornDash,
    renderFornChecklist,
    fornToggleStatus,

    // Portal Membro
    renderMembroDash,

    // Portal Cliente
    renderClienteDash,

    // Clientes
    openModalNovoCliente,
    editClient,
    saveNovoCliente,
    deleteClient,

    // Fornecedores / Equipes
    openModalManualForn,
    editForn,
    saveManualForn,
    submitRegForn,
    deleteForn,
    toggleLiderSelect,

    // Gestores
    openModalGestores,
    saveNovoGestor,
    deleteGestor,

    // Composições
    openModalComposicao,
    editComposicao,
    saveComposicao,
    deleteComposicao,
    aplicarComposicao,
};

// ── Expõe funções chamadas diretamente no HTML (onclick="...") ─
window.toggleMobileMenu  = toggleMobileMenu;
window.showMasterSection = showMasterSection;
window.switchObraTab     = switchObraTab;

// ── Funções de render expostas para o auth.js via window.APP ──
window.APP.renderMasterObrasGrid   = renderMasterObrasGrid;
window.APP.renderObraDetail        = renderObraDetail;
window.APP.renderFornAdmin         = renderFornAdmin;
window.APP.renderClientsList       = renderClientsList;
window.APP.renderFornDash          = renderFornDash;
window.APP.renderMembroDash        = renderMembroDash;
window.APP.renderClienteDash       = renderClienteDash;
window.APP.populaSelectClientes    = populaSelectClientes;
window.APP.populaSelectManualForn  = populaSelectManualForn;
window.APP.populaSelectComposicoes = populaSelectComposicoes;
window.APP.renderComposicoesList   = renderComposicoesList;
window.APP.renderListaGestores          = renderListaGestores;
window.APP.renderObrasFinalizadasGrid   = renderObrasFinalizadasGrid;
window.APP.renderHistoricoIntelligence  = renderHistoricoIntelligence;

// ── Funções chamadas por ui.js (switchObraTab) e auth.js ─────
// ESTAS DEVEM estar em window.APP — sem isso as abas ficam vazias
window.APP.renderMedicoes    = renderMedicoes;
window.APP.renderMasterPonto = renderMasterPonto;
window.APP.renderCurvaS      = renderCurvaS;
window.APP.STATE             = STATE;

// ── Expõe funções de notificação no window.APP ───────────────
window.APP.notificarServicoConcluido = notificarServicoConcluido;
window.APP.notificarCheckin          = notificarCheckin;
window.APP.notificarAtraso           = notificarAtraso;
window.APP.notificarGargalo          = notificarGargalo;
window.APP.notificarCheckinPendente  = notificarCheckinPendente;
window.APP.initNotifications         = initNotifications;

// ── Inicia autenticação Firebase + watchers Firestore ─────────
setupAuth();

// ── Offline listeners ─────────────────────────────────────────
initOfflineListeners();

// ── Service Worker ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('Sistema Offline Pronto');
                reg.onupdatefound = () => {
                    const w = reg.installing;
                    w.onstatechange = () => {
                        if (w.state === 'installed' && navigator.serviceWorker.controller) {
                            if (confirm('Nova atualização disponível! Deseja carregar agora?')) {
                                window.location.reload();
                            }
                        }
                    };
                };
                sincronizarDados();
            })
            .catch(err => console.log('Erro no Service Worker', err));
    });
}
