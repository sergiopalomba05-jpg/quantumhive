import React, { useState } from "react";
import { BillingPackage } from "../types";
import { CreditCard, ShieldCheck, Zap, Coins, Clock, Sparkles, Check, ArrowRight } from "lucide-react";

interface BillingHubProps {
  currentMinutes: number;
  onAddMinutes: (amount: number) => void;
  isMemoryPlanActive: boolean;
  onToggleMemoryPlan: () => void;
}

const BILLING_PACKAGES: BillingPackage[] = [
  {
    id: "pack-starter",
    minutes: 15,
    price: 9.99,
    title: "Eco Hive",
    description: "Ideal para consultas rápidas de tarot, dudas legales urgentes o feedback de ventas.",
    badge: "Más Económico"
  },
  {
    id: "pack-pro",
    minutes: 60,
    price: 29.99,
    title: "Quantum Executive",
    description: "Perfecto para sesiones de terapia completas o clases particulares de matemáticas/yoga.",
    badge: "Recomendado"
  },
  {
    id: "pack-unlimited",
    minutes: 300,
    price: 99.99,
    title: "Mother Intelligence Core",
    description: "Acceso Premium ampliado. Máxima prioridad de ancho de banda y renderizado de avatar 4K.",
    badge: "Elite Corporativo"
  }
];

export default function BillingHub({ 
  currentMinutes, 
  onAddMinutes,
  isMemoryPlanActive,
  onToggleMemoryPlan
}: BillingHubProps) {
  const [selectedPack, setSelectedPack] = useState<BillingPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPurchasedMins, setLastPurchasedMins] = useState(0);

  const handlePurchase = (pkg: BillingPackage) => {
    setSelectedPack(pkg);
    setShowSuccess(false);
  };

  const confirmSimulatedPayment = () => {
    if (!selectedPack) return;
    setIsProcessing(true);

    setTimeout(() => {
      onAddMinutes(selectedPack.minutes);
      setLastPurchasedMins(selectedPack.minutes);
      setIsProcessing(false);
      setShowSuccess(true);
      setSelectedPack(null);
    }, 2000);
  };

  return (
    <div className="p-5 space-y-6 text-white animate-fade-in">
      
      {/* Tab Title Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/30">
          <Coins className="w-5 h-5 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-md font-bold tracking-wide">Planes y Packs de Minutos</h2>
          <p className="text-[11px] text-white/50">Recarga el tiempo de cómputo para tus avatares en tiempo real</p>
        </div>
      </div>

      {/* Balance Ring Card */}
      <div className="p-5 bg-gradient-to-br from-brand-surface to-black border border-brand-primary/25 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl" />
        <div className="space-y-1.5 z-10">
          <span className="text-[10px] font-mono text-brand-primary uppercase tracking-widest font-bold">Tiempo de Cómputo Disponible</span>
          <h3 className="text-3xl font-black tracking-tight text-white flex items-baseline gap-1">
            {currentMinutes} 
            <span className="text-xs font-normal text-white/50">minutos</span>
          </h3>
          <p className="text-[10px] text-white/40 leading-relaxed max-w-[220px]">
            La llamada con avatares se suspenderá automáticamente cuando el balance llegue a 0.
          </p>
        </div>

        <div className="flex-shrink-0 relative">
          <div className="w-16 h-16 rounded-full border-4 border-brand-primary/10 flex items-center justify-center p-1.5 bg-black/40">
            <div className="w-full h-full rounded-full border-4 border-brand-primary border-t-transparent animate-spin" style={{ animationDuration: "6s" }} />
          </div>
          <Clock className="w-5 h-5 text-brand-primary absolute inset-0 m-auto" />
        </div>
      </div>

      {/* Plan de Memoria Compartida Mensual */}
      <div className="p-5 bg-gradient-to-r from-emerald-950/40 to-brand-surface border border-emerald-500/30 rounded-2xl space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl" />
        
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 inline-block">
              PLAN DE MEMORIA COMPARTIDA
            </span>
            <h3 className="text-md font-bold text-white mt-1.5 flex items-center gap-2">
              <span>Quantum Memory Share</span>
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Habilita la activación de <strong>memoria persistente de largo plazo</strong> en todos tus profesionales contratados. Tus asistentes recordarán tus consultas, antecedentes y datos compartidos de forma unificada.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-2">
          <div>
            <span className="text-[10px] text-white/40 block font-mono">SUSCRIPCIÓN MENSUAL</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">$14.99 USD <span className="text-[10px] text-white/50 font-sans">/ mes</span></span>
          </div>

          <button
            onClick={onToggleMemoryPlan}
            className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
              isMemoryPlanActive
                ? "bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300"
                : "bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-wider"
            }`}
          >
            {isMemoryPlanActive ? "Suscrito (Cancelar)" : "Suscribirme al Plan"}
          </button>
        </div>
      </div>

      {/* Success Modal Notification */}
      {showSuccess && (
        <div className="p-4 bg-brand-primary/10 border border-brand-primary/30 rounded-2xl flex items-start gap-3 animate-bounce-short">
          <div className="p-1.5 bg-brand-primary/20 rounded-lg">
            <Zap className="w-5 h-5 text-brand-primary" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">¡Acreditación Exitosa!</h4>
            <p className="text-[11px] text-white/80">
              Se han agregado <strong className="text-white font-bold">{lastPurchasedMins} minutos</strong> a tu cuenta Quantum Hive. Disfruta tus interacciones sin límites.
            </p>
          </div>
        </div>
      )}

      {/* Checkout Screen in-place overlay style */}
      {selectedPack ? (
        <div className="p-5 bg-brand-surface border border-brand-primary/40 rounded-2xl space-y-4 animate-fade-in relative">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div>
              <span className="text-[9px] font-mono text-brand-primary uppercase font-bold tracking-widest">Resumen de Orden</span>
              <h4 className="text-sm font-bold text-white">{selectedPack.title}</h4>
            </div>
            <button 
              onClick={() => setSelectedPack(null)}
              className="text-xs text-white/50 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-2 text-xs text-white/70">
            <div className="flex justify-between">
              <span>Tiempo de Recarga:</span>
              <span className="font-mono text-white font-bold">+{selectedPack.minutes} min</span>
            </div>
            <div className="flex justify-between">
              <span>Costo del Pack:</span>
              <span className="font-mono text-brand-primary font-bold">${selectedPack.price} USD</span>
            </div>
            <div className="flex justify-between font-bold border-t border-white/5 pt-2 text-sm text-white">
              <span>Total a Pagar:</span>
              <span className="text-brand-primary font-mono">${selectedPack.price} USD</span>
            </div>
          </div>

          {/* Simulated Card input */}
          <div className="space-y-2 pt-1">
            <label className="text-[10px] text-white/50 font-mono block pl-1">INFORMACIÓN DE PAGO SIMULADA</label>
            <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center gap-2.5">
              <CreditCard className="w-4.5 h-4.5 text-brand-primary" />
              <input 
                type="text" 
                readOnly 
                value="••••  ••••  ••••  4242"
                className="bg-transparent text-xs text-white outline-none w-full font-mono"
              />
              <span className="text-[10px] text-brand-primary font-mono bg-brand-primary/15 border border-brand-primary/20 px-1.5 py-0.5 rounded">
                SIMULADO
              </span>
            </div>
          </div>

          <button
            onClick={confirmSimulatedPayment}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-bg font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-4.5 h-4.5 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                <span>Procesando pago seguro...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4.5 h-4.5" />
                <span>Confirmar Pago de ${selectedPack.price} USD</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Package list */
        <div className="space-y-3">
          {BILLING_PACKAGES.map((pkg) => (
            <div 
              key={pkg.id} 
              className="p-4 bg-brand-surface/70 hover:bg-brand-surface border border-white/10 hover:border-brand-primary/30 rounded-2xl flex flex-col gap-3.5 transition-all relative group"
            >
              {pkg.badge && (
                <span className="absolute top-3.5 right-4 bg-brand-primary/10 border border-brand-primary/20 text-[9px] text-brand-primary font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  {pkg.badge}
                </span>
              )}

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">
                  {pkg.title}
                </h4>
                <p className="text-[11px] text-white/50 leading-relaxed pr-24">
                  {pkg.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-white font-mono">{pkg.minutes}</span>
                  <span className="text-[10px] text-white/40">minutos de cómputo</span>
                </div>
                
                <button
                  onClick={() => handlePurchase(pkg)}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-[11px] font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Comprar por ${pkg.price}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Disclaimer Banner */}
      <div className="p-3.5 bg-black/40 border border-white/5 rounded-xl flex items-start gap-2.5 text-[10px] text-white/40 leading-relaxed">
        <ShieldCheck className="w-4.5 h-4.5 text-brand-primary/70 flex-shrink-0" />
        <p>
          Las transacciones son puramente simuladas para demostración interactiva de la plataforma. El procesamiento del motor y de las videollamadas con IA son totalmente funcionales en tiempo real.
        </p>
      </div>

    </div>
  );
}
