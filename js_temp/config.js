// ============================================================
// config.js — Firebase Config, API Helpers e Estado Global
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, updateDoc, collection, onSnapshot, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ── Firebase config ──────────────────────────────────────────
export const FB_CONFIG = {
    apiKey: "AIzaSyCnEksJ4i8BhZkHB994bBbJeDa68GOsxMg",
    authDomain: "bancodedadosarcco.firebaseapp.com",
    projectId: "bancodedadosarcco",
    storageBucket: "bancodedadosarcco.firebasestorage.app",
    messagingSenderId: "786744062496",
    appId: "1:786744062496:web:b9668edca9e093480c0245"
};

export const APP_ID = 'arcco-v13-estrutural';

export const firebaseApp = initializeApp(FB_CONFIG);
export const auth = getAuth(firebaseApp);
export const db   = getFirestore(firebaseApp);

// ── API helpers ───────────────────────────────────────────────
export const col     = (name)        => collection(db, 'artifacts', APP_ID, 'public', 'data', name);
export const docR    = (name, id)    => doc(db, 'artifacts', APP_ID, 'public', 'data', name, id);
export const apiAdd    = (c, d)      => addDoc(col(c), d);
export const apiUpdate = (c, id, d)  => updateDoc(docR(c, id), d);
export const apiDelete = (c, id)     => deleteDoc(docR(c, id));

// ── Estado Global ─────────────────────────────────────────────
export const STATE = {
    activeUser: null,
    currentObraId: null,
    editingTaskId: null,
    editingClientId: null,
    editingFornId: null,
    editingCompId: null,
    editingModuloOldName: null,
    obras: [], forn: [], clients: [], gestores: [], composicoes: [],
    donutChart: null, barChart: null
};

// ── Date utils ───────────────────────────────────────────────
export const today     = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
export const todayISO  = () => new Date().toISOString().split('T')[0];
export const parseDate = (s) => { if(!s) return null; const [y,m,d] = s.split('-'); return new Date(y,m-1,d); };
export const fmtBRL    = (v) => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const fmtDate   = (s) => s ? s.split('-').reverse().join('/') : 'S/ Data';
export const fmtDiaSemana = (iso) => {
    if(!iso) return '';
    const d = parseDate(iso);
    return d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
};

// ── Paleta de cores por módulo ────────────────────────────────
export const MOD_COLORS = ['#ccff00','#111111','#f97316','#3b82f6','#8b5cf6','#14b8a6','#ec4899','#f59e0b','#84cc16','#06b6d4'];

// ── Module sort ───────────────────────────────────────────────
export const sortModulos = (arr) => arr.sort((a,b) => {
    const vA = a.match(/^([\d.]+)/), vB = b.match(/^([\d.]+)/);
    if(!vA && !vB) return a.localeCompare(b);
    if(!vA) return 1; if(!vB) return -1;
    const pA = vA[1].split('.').map(Number), pB = vB[1].split('.').map(Number);
    for(let i=0;i<Math.max(pA.length,pB.length);i++){
        const d = (pA[i]||0)-(pB[i]||0);
        if(d!==0) return d;
    }
    return a.localeCompare(b);
});

// ── Auth setup ────────────────────────────────────────────────
export { onAuthStateChanged, signInAnonymously };
