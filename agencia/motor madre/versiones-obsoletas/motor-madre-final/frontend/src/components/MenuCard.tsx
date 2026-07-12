import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, Star, Flame, Sparkles } from "lucide-react";
import { MenuItem } from "../types";
import { getDishImage } from "../imageMap";

interface MenuCardProps {
  item: MenuItem;
  categoryId: string;
  qty: number;
  onAdd: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  isSpotlight?: boolean;
}

export const MenuCard: React.FC<MenuCardProps> = ({
  item,
  categoryId,
  qty,
  onAdd,
  onDecrease,
  onIncrease,
  isSpotlight = false,
}) => {
  const imageUrl = getDishImage(item.id, categoryId);

  // Generate some playful visual badges depending on the dish item
  const getBadge = () => {
    const name = item.name.toLowerCase();
    const desc = (item.description || "").toLowerCase();
    if (name.includes("bbq") || name.includes("especias") || name.includes("picante")) {
      return { text: "Especialidad", icon: <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />, bg: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
    }
    if (name.includes("casa") || name.includes("escaloneta") || name.includes("kansas") || isSpotlight) {
      return { text: "Recomendado", icon: <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />, bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
    }
    if (desc.includes("casero") || desc.includes("delicioso") || name.includes("blend")) {
      return { text: "De la Casa", icon: <Sparkles className="w-3 h-3 text-pink-500" />, bg: "bg-pink-500/10 text-pink-400 border-pink-500/20" };
    }
    return null;
  };

  const badge = getBadge();
  const formatPriceARS = (p: number | null) => {
    if (p === null || p === undefined) return "Consultar";
    return `$${p.toLocaleString("es-AR")}`;
  };

  return (
    <motion.div
      layout
      id={`dish-${item.id}`}
      className={`relative flex flex-col h-full bg-[#181210]/90 rounded-2xl overflow-hidden border transition-all duration-500 ${
        isSpotlight
          ? "border-gold shadow-[0_0_25px_rgba(201,168,106,0.6)] scale-[1.03] ring-2 ring-gold/30 z-10"
          : "border-gold/15 hover:border-gold/30 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5"
      }`}
    >
      {/* Product Image */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-[#0e0a07]">
        <motion.img
          src={imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#181210] via-[#181210]/20 to-transparent" />

        {/* Dynamic Badge */}
        {badge && (
          <div className={`absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border backdrop-blur-md ${badge.bg}`}>
            {badge.icon}
            <span>{badge.text}</span>
          </div>
        )}

        {/* Brand overlay for premium feel */}
        {item.bodega && (
          <div className="absolute bottom-3 left-3 text-[11px] font-semibold tracking-wider uppercase text-gold/80 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-gold/10">
            {item.bodega}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-col flex-grow p-4 md:p-5">
        <h3 className="font-serif font-medium text-lg leading-tight text-white mb-2 tracking-tight group-hover:text-gold transition-colors">
          {item.name}
        </h3>
        
        {item.description && (
          <p className="font-sans text-xs text-[#9a8e78] line-clamp-3 leading-relaxed flex-grow">
            {item.description}
          </p>
        )}

        {/* Pricing and Stepper Controls */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gold/10">
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg text-gold tracking-tight">
              {formatPriceARS(item.price)}
            </span>
            {item.price === null && (
              <span className="text-[10px] text-[#5c4639] italic">
                Confirmar con el mozo
              </span>
            )}
          </div>

          {/* Stepper container */}
          <div className="h-10 flex items-center justify-end">
            <AnimatePresence mode="wait">
              {qty === 0 ? (
                <motion.button
                  key="add-btn"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAdd}
                  className="flex items-center gap-1.5 px-4 h-9 bg-accent hover:bg-accent-dark text-[#F4ECD8] text-xs font-bold uppercase tracking-wider rounded-full border border-gold/25 shadow-md shadow-accent/20 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </motion.button>
              ) : (
                <motion.div
                  key="stepper"
                  initial={{ opacity: 0, scale: 0.9, width: "auto" }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center bg-[#241a16] border border-accent rounded-full overflow-hidden shadow-inner h-9"
                >
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={onDecrease}
                    className="w-9 h-full flex items-center justify-center text-gold hover:bg-accent hover:text-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <motion.span
                    key={qty}
                    initial={{ y: -5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 5, opacity: 0 }}
                    className="min-w-6 text-center font-bold text-sm text-[#F4ECD8] px-1 font-sans"
                  >
                    {qty}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={onIncrease}
                    className="w-9 h-full flex items-center justify-center text-gold hover:bg-accent hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
