import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROMPT = ROOT / "agencia" / "clientes" / "yas-papeo" / "system_prompt.md"
PROPOSAL = ROOT / "agencia" / "clientes" / "yas-papeo" / "docs" / "propuesta-agente-humanizado.html"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class YasPapeoPromptAndProposalTest(unittest.TestCase):
    def test_prompt_covers_new_treatments_prices_and_deposits(self):
        prompt = read(PROMPT)
        for text in (
            "Keratina libre de formol",
            "Alisado Brazilian",
            "150.000 y 170.000 pesos",
            "260.000 y 315.000 pesos",
            "seña de 40.000 pesos",
            "seña de 60.000 pesos",
            "seña de 80.000 pesos",
        ):
            self.assertIn(text, prompt)

    def test_prompt_distinguishes_human_support_from_salon_hours(self):
        prompt = read(PROMPT)
        self.assertIn("martes a sábados de 9 a 22", prompt)
        self.assertIn("lunes a viernes de 9 a 14", prompt)
        self.assertIn("agendar online", prompt)
        self.assertIn("atencion mas personalizada", prompt)

    def test_prompt_blocks_fake_agenda_and_overdone_pet_names(self):
        prompt = read(PROMPT)
        for text in (
            "No inventes disponibilidad",
            "No propongas horarios exactos",
            "No digas \"hoy tenemos turno\"",
            "Si no hay agenda viva conectada, pedí día o rango horario preferido",
            "No uses bella, hermosa o reina en todas las respuestas",
            "como máximo una vez cada varios mensajes",
        ):
            self.assertIn(text, prompt)

    def test_prompt_forces_argentine_pesos_never_dollars(self):
        prompt = read(PROMPT)
        for text in (
            "Todos los precios del salon estan en pesos",
            "En audio deci pesos",
        ):
            self.assertIn(text, prompt)
        self.assertNotIn("pesos argentinos", prompt)
        self.assertNotIn("dolares", prompt.lower())
        self.assertNotIn("usd", prompt.lower())
        self.assertNotIn("$", prompt)

    def test_prompt_uses_audio_safe_words(self):
        prompt = read(PROMPT)
        for text in (
            "Usa rango horario",
            "No uses franja",
            "No escribas hs en respuestas para audio",
            "formol,",
            "Escribi el numero y al final la palabra pesos",
        ):
            self.assertIn(text, prompt)

    def test_prompt_includes_new_hair_color_and_repeat_rules(self):
        prompt = read(PROMPT)
        for text in (
            "canas naturales",
            "¿Actualmente teñís tus canas o las mantenés con su color natural?",
            "la tintura o decoloración",
            "puede volver a realizarse aproximadamente cada 2 meses",
            "aproximadamente cada 5 a 6 meses",
        ):
            self.assertIn(text, prompt)

    def test_proposal_sells_two_plans_with_founder_pricing(self):
        proposal = read(PROPOSAL)
        for text in (
            "Plan Base",
            "Plan Plus",
            "USD 300",
            "USD 400",
            "USD 600",
            "Empleada virtual IA",
            "Agente IA humanizado · Yaspapeobeauty",
            "Agente IA humanizado",
            "Instagram",
            "base de datos vectorial",
            "clonación de voz",
            "Recordatorios de turnos",
            "empleada virtual",
            "no reemplaza por algo frío",
            "Ninguna clienta sin respuesta",
            "nunca a un robot",
            "la calidez de Yaspapeobeauty",
            "privada",
            "Memoria e integración en Instagram",
            "audio preguntando cómo va el tratamiento",
            "text-decoration: line-through",
            "agendar su turno online en el momento",
            "asesoramiento 100% personalizado",
            "lunes a viernes de 9hs a 14hs",
            "nueva integrante",
            "Puede hablar con varias clientas al mismo tiempo",
        ):
            self.assertIn(text, proposal)
        self.assertLess(proposal.index("Implementación inicial"), proposal.index("Planes"))
        self.assertNotIn("Propuesta comercial · Yaspapeobeauty", proposal)
        self.assertNotIn("Precio especial de clienta fundadora", proposal)
        self.assertNotIn("El punto clave es lo que pidió Yas", proposal)
        self.assertNotIn("Esto responde exactamente a lo que pidió Yas", proposal)


if __name__ == "__main__":
    unittest.main()
