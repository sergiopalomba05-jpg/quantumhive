// Plantilla de configuración de la PWA. Copiá este archivo a `config.js` y completá la key.
// `config.js` está en .gitignore → NO sube al repo.
//
// SUPABASE_ANON_KEY = la anon key JWT (empieza con "eyJ..."), NO la publishable:
// el chat la usa para llamar a la Edge Function (verify_jwt). Solo LECTURA + RLS, pública por diseño.
// ⚠️ NUNCA pongas acá la `service_role` (esa solo va del lado servidor).
window.QH_CONFIG = {
  SUPABASE_URL: "https://gbngjsulhqcwgkqoxozy.supabase.co",
  SUPABASE_ANON_KEY: ""  // pegá la anon key (JWT "eyJ...") del proyecto quantumhive-hermes
};
