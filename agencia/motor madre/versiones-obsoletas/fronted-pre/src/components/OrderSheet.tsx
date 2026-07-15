import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ClipboardList, Trash2, Smartphone, ReceiptText, ChevronRight } from "lucide-react";
import { CartItem } from "../types";

interface OrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onDecrease: (id: string) => void;
  onIncrease: (id: string) => void;
  onRemove: (id: string) => void;
  table: string;
  setTable: (table: string) => void;
  tableLocked: boolean;
  onSendOrder: () => void;
}

export const OrderSheet: React.FC<OrderSheetProps> = ({
  isOpen,
  onClose,
  cart,
  onDecrease,
  onIncrease,
  onRemove,
  table,
  setTable,
  tableLocked,
  onSendOrder,
}) => {
  const [showWaiterTicket, setShowWaiterTicket] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const formatPriceARS = (p: number) => {
    return `$${p.toLocaleString("es-AR")}`;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-[#181210] border-t border-gold/25 flex flex-col z-40 rounded-t-3xl shadow-2xl overflow-hidden"
            >
              {/* Grab handle */}
              <div className="w-10 h-1 bg-gold/20 rounded-full mx-auto my-3" />

              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-4 border-b border-gold/10">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-gold" />
                  <h3 className="font-serif font-bold text-xl text-[#F4ECD8]">
                    Tu Pedido
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-[#9a8e78] hover:text-white rounded-full bg-white/5 hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-grow overflow-y-auto px-6 py-4 flex flex-col gap-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-[#9a8e78] flex flex-col items-center justify-center gap-2">
                    <ReceiptText className="w-10 h-10 text-[#5c4639] mb-2" />
                    <p className="font-serif font-medium text-lg text-gold/80">Tu comanda está vacía</p>
                    <p className="text-xs max-w-[200px] leading-relaxed">
                      Elegí platos deliciosos o conversá con Sol para armar tu pedido.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-gold/10">
                    {cart.map((item) => (
                      <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex-grow min-w-0">
                          <h4 className="font-serif font-semibold text-[15px] text-[#F4ECD8] leading-snug truncate">
                            {item.name}
                          </h4>
                          <span className="text-xs text-[#9a8e78] font-mono">
                            {formatPriceARS(item.price)} c/u
                          </span>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center bg-black/35 rounded-full border border-gold/10 p-0.5 h-8">
                          <button
                            onClick={() => onDecrease(item.id)}
                            className="w-7 h-full flex items-center justify-center text-gold hover:text-white"
                          >
                            -
                          </button>
                          <span className="min-w-6 text-center text-xs font-bold text-[#F4ECD8]">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => onIncrease(item.id)}
                            className="w-7 h-full flex items-center justify-center text-gold hover:text-white"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total */}
                        <div className="min-w-[70px] text-right">
                          <span className="font-serif font-bold text-sm text-[#e9e0c7]">
                            {formatPriceARS(item.price * item.qty)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotals & Table details */}
                {cart.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-dashed border-cocoa-soft/30 space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-[#9a8e78] font-medium">Total estimado</span>
                      <span className="font-serif font-bold text-2xl text-gold">
                        {formatPriceARS(cartTotal)}
                      </span>
                    </div>

                    {/* Table field */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gold/80">
                        Número de Mesa
                      </label>
                      <input
                        type="text"
                        value={table}
                        onChange={(e) => setTable(e.target.value.slice(0, 10))}
                        disabled={tableLocked}
                        placeholder={tableLocked ? "" : "Ej: 14"}
                        className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none ${
                          tableLocked
                            ? "bg-transparent text-white border-0 font-bold text-lg p-0 cursor-not-allowed"
                            : "bg-black/30 text-white border border-gold/25 focus:border-gold"
                        }`}
                      />
                      {tableLocked && (
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                          ✓ Asignada automáticamente por QR
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div className="p-5 bg-[#140e0b] border-t border-gold/10 flex flex-col gap-3 pb-[max(1.2rem,env(safe-area-inset-bottom))]">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowWaiterTicket(true)}
                      className="h-12 border border-gold/30 hover:bg-gold/5 text-gold text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <ReceiptText className="w-4 h-4" />
                      <span>Ver Ticket</span>
                    </button>
                    <button
                      onClick={onSendOrder}
                      disabled={!table.trim()}
                      className="h-12 bg-accent hover:bg-accent-dark disabled:bg-[#342a25] disabled:text-[#9a8e78] text-[#F4ECD8] text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent/25 transition-all"
                    >
                      <span>Pedir</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen High-Contrast Waiter Ticket Overlay */}
      <AnimatePresence>
        {showWaiterTicket && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-[#F4ECD8] text-[#0E0A07] z-50 flex flex-col p-6 overflow-hidden md:max-w-md md:mx-auto md:my-10 md:rounded-3xl md:border md:border-gold shadow-2xl"
          >
            {/* Grab Handle Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[#0e0a07]/10 mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b1c2b]">
                  La Escaloneta
                </span>
                <h4 className="font-serif font-black text-xl">Comanda Digital</h4>
              </div>
              <button
                onClick={() => setShowWaiterTicket(false)}
                className="w-10 h-10 rounded-full border border-[#0e0a07]/20 flex items-center justify-center font-bold text-[#0e0a07]/80 hover:bg-[#0e0a07]/5"
              >
                ✕
              </button>
            </div>

            {/* Huge Table Box */}
            <div className="bg-[#0e0a07] text-[#F4ECD8] text-center py-5 rounded-2xl mb-5 shadow-lg">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gold/80 block mb-1">
                Número de Mesa
              </span>
              <span className="font-sans font-black text-5xl tracking-tighter">
                {table || "S/N"}
              </span>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto pr-2 divide-y divide-[#0e0a07]/10">
              {cart.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-baseline gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-sans font-black text-lg text-[#8b1c2b]">
                      {item.qty}×
                    </span>
                    <span className="font-serif font-bold text-base leading-tight">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-sans font-semibold text-sm">
                    {formatPriceARS(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-double border-[#0e0a07]/20 flex justify-between items-baseline mb-6">
              <span className="text-sm font-bold uppercase tracking-wider">Total Estimado</span>
              <span className="font-serif font-black text-3xl text-[#8b1c2b]">
                {formatPriceARS(cartTotal)}
              </span>
            </div>

            {/* Footer action */}
            <button
              onClick={() => {
                setShowWaiterTicket(false);
                onSendOrder();
              }}
              className="w-full h-14 bg-[#8b1c2b] text-[#F4ECD8] font-bold uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] transition-all"
            >
              <Smartphone className="w-5 h-5 animate-pulse" />
              <span>Confirmar comanda</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
