const configured=String(import.meta.env.VITE_APP_MODE||'').toLowerCase();
export const APP_MODE=configured==='creator'||configured==='online'?configured:(import.meta.env.PROD?'online':'creator');
