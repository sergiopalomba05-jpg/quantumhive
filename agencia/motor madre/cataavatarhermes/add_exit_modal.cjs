const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const anchor = `        {confirmModal && (
          <div className="modal-overlay open">
            <div className="modal-card">
              <h3>{confirmModal.title}</h3>
              <p>{confirmModal.text}</p>
              <div className="modal-actions">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="leave"
                >
                  No
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="stay"
                >
                  Sí, agregar
                </button>
              </div>
            </div>
          </div>
        )}`;

const insertion = `        {confirmModal && (
          <div className="modal-overlay open">
            <div className="modal-card">
              <h3>{confirmModal.title}</h3>
              <p>{confirmModal.text}</p>
              <div className="modal-actions">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="leave"
                >
                  No
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="stay"
                >
                  Sí, agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- EXIT CONFIRMATION MODAL --- */}
        {showExitConfirm && (
          <div className="modal-overlay open z-[999999]">
            <div className="modal-card bg-[#1A120E] border border-[#C9A86A]/30">
              <h3 className="text-[#C9A86A]">Salir de la aplicación</h3>
              <p className="text-stone-300">¿Estás seguro que querés salir de la carta?</p>
              <div className="modal-actions mt-4 flex gap-3">
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 rounded-lg font-bold uppercase text-[11px] tracking-widest bg-stone-800 text-stone-300 border border-stone-600 active:scale-95 transition-all"
                >
                  Me quedo
                </button>
                <button 
                  onClick={() => {
                    // Try to go back fully or close
                    window.history.go(-2);
                    setTimeout(() => window.close(), 100);
                  }}
                  className="flex-1 py-2 rounded-lg font-bold uppercase text-[11px] tracking-widest bg-red-900/40 text-red-400 border border-red-900 active:scale-95 transition-all"
                >
                  Sí, salir
                </button>
              </div>
            </div>
          </div>
        )}`;

code = code.replace(anchor, insertion);
fs.writeFileSync('src/App.tsx', code);
console.log("Added exit modal!");
