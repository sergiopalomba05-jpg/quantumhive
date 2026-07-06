import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Send, Award, Heart, CheckCircle2 } from "lucide-react";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ratings: {
    waitress: number;
    restaurant: number;
    experience: number;
    comment: string;
    suggestion: string;
  }) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [waitressRating, setWaitressRating] = useState(0);
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [experienceRating, setExperienceRating] = useState(0);
  const [comment, setComment] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [step, setStep] = useState<"rating" | "feedback" | "success">("rating");

  const handleSubmitRating = () => {
    if (waitressRating === 0 || restaurantRating === 0 || experienceRating === 0) {
      alert("Por favor, seleccioná las estrellas para calificar todos los campos.");
      return;
    }
    // Transition to the detailed feedback (the QuantumHive demo request)
    setStep("feedback");
  };

  const handleFinalSubmit = () => {
    onSubmit({
      waitress: waitressRating,
      restaurant: restaurantRating,
      experience: experienceRating,
      comment,
      suggestion,
    });
    setStep("success");
  };

  const handleClose = () => {
    // Reset state before closing
    setWaitressRating(0);
    setRestaurantRating(0);
    setExperienceRating(0);
    setComment("");
    setSuggestion("");
    setStep("rating");
    onClose();
  };

  const renderStars = (current: number, setRating: (v: number) => void) => {
    return (
      <div className="flex justify-center gap-1.5 mt-1.5">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            onClick={() => setRating(val)}
            className="p-1 cursor-pointer transition-transform active:scale-125"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                val <= current
                  ? "text-gold fill-gold drop-shadow-[0_0_6px_rgba(201,168,106,0.3)]"
                  : "text-gold/20 hover:text-gold/45"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-gradient-to-b from-[#201712] to-[#14100d] border border-gold/25 rounded-3xl p-6 shadow-2xl relative text-center"
            >
              {step === "rating" && (
                <div>
                  <Award className="w-12 h-12 text-gold mx-auto mb-2.5" />
                  <h3 className="font-serif font-black text-2xl text-white mb-1">
                    ¿Cómo estuvo tu experiencia?
                  </h3>
                  <p className="font-sans text-xs text-[#9a8e78] mb-6 leading-relaxed">
                    Tu pedido ya está marchando en cocina 🎉 <br />
                    ¿Nos ayudás con tu opinión en 10 segundos?
                  </p>

                  <div className="space-y-5 text-left">
                    {/* Waitress evaluation */}
                    <div className="bg-[#181210]/50 p-3 rounded-2xl border border-gold/5">
                      <span className="block text-center text-xs font-semibold tracking-wide text-[#e9e0c7]">
                        ¿Cómo te atendió Sol (tu mesera virtual)?
                      </span>
                      {renderStars(waitressRating, setWaitressRating)}
                    </div>

                    {/* Restaurant evaluation */}
                    <div className="bg-[#181210]/50 p-3 rounded-2xl border border-gold/5">
                      <span className="block text-center text-xs font-semibold tracking-wide text-[#e9e0c7]">
                        ¿Y el restaurante? (comida y atención)
                      </span>
                      {renderStars(restaurantRating, setRestaurantRating)}
                    </div>

                    {/* Digital evaluation */}
                    <div className="bg-[#181210]/50 p-3 rounded-2xl border border-gold/5">
                      <span className="block text-center text-xs font-semibold tracking-wide text-[#e9e0c7]">
                        ¿Qué tal la experiencia digital de Carta Viva?
                      </span>
                      {renderStars(experienceRating, setExperienceRating)}
                    </div>

                    {/* Optional Comment */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gold/80 pl-1">
                        ¿Algo para mejorar? (Opcional)
                      </label>
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Escribí tu comentario o queja..."
                        className="w-full h-11 px-4 bg-black/30 border border-gold/15 focus:border-gold rounded-xl text-xs text-white placeholder-gold/30 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleSubmitRating}
                      className="w-full h-12 bg-accent hover:bg-accent-dark text-[#F4ECD8] text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer active:scale-98 transition-all"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {step === "feedback" && (
                <div className="text-left">
                  <Heart className="w-12 h-12 text-accent mx-auto mb-2.5 animate-pulse" />
                  <h3 className="font-serif font-black text-2xl text-white mb-2 text-center">
                    De parte de QuantumHive 👁
                  </h3>
                  <p className="font-sans text-xs text-[#9a8e78] mb-5 leading-relaxed text-center">
                    ¡Mil gracias! Como estás usando una versión de demo de <strong>Carta Viva</strong>, nos encantaría saber qué te pareció Sol, qué funciones le sumarías o qué te gustaría mejorar.
                  </p>

                  <div className="flex flex-col gap-2 mb-5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gold/85">
                      Sugerencias de Producto
                    </label>
                    <textarea
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                      placeholder="Contanos lo que se te ocurra para entrenar un mejor producto..."
                      rows={4}
                      className="w-full p-4 bg-black/30 border border-gold/15 focus:border-gold rounded-xl text-xs text-white placeholder-gold/30 outline-none resize-none transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleFinalSubmit} // skip suggestion
                      className="flex-1 h-12 border border-[#9a8e78]/30 hover:bg-white/5 text-[#9a8e78] text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all"
                    >
                      Omitir
                    </button>
                    <button
                      onClick={handleFinalSubmit}
                      className="flex-1 h-12 bg-accent hover:bg-accent-dark text-[#F4ECD8] text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-accent/20 transition-all"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}

              {step === "success" && (
                <div>
                  <CheckCircle2 className="w-16 h-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="font-serif font-black text-2xl text-white mb-2">
                    ¡Calificación recibida!
                  </h3>
                  <p className="font-sans text-xs text-[#9a8e78] mb-6 leading-relaxed">
                    ¡Muchísimas gracias por ayudarnos a mejorar! <br />
                    Tus comentarios alimentan las neuronas de Sol y de nuestro equipo. ¡Que disfrutes la comida!
                  </p>

                  <button
                    onClick={handleClose}
                    className="w-full h-12 bg-gold hover:bg-gold/90 text-[#0e0a07] text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
