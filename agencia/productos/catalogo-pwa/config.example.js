// Plantilla de configuración de la PWA. Copiá este archivo a `config.js` y completá la key.
// `config.js` está en .gitignore → NO sube al repo.
//
// La SUPABASE_ANON_KEY es la key PUBLISHABLE (anónima): solo LECTURA, protegida por RLS.
// Es pública por diseño (viaja al navegador de cada visitante) y no puede escribir nada.
// ⚠️ NUNCA pongas acá la `service_role` (esa solo va en el .env local de Hermes).
window.QH_CONFIG = {
  SUPABASE_URL: "https://gbngjsulhqcwgkqoxozy.supabase.co",
  SUPABASE_ANON_KEY: ""  // pegá la publishable/anon key del proyecto quantumhive-hermes
};
