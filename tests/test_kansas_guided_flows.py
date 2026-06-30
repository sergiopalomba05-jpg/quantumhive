import unittest
from pathlib import Path


APP = Path(__file__).resolve().parents[1] / "agencia" / "clientes" / "kansas" / "app.py"


def source() -> str:
    return APP.read_text(encoding="utf-8")


class KansasGuidedFlowsTest(unittest.TestCase):
    def test_backend_exposes_four_pregrabbed_guided_flows(self):
        src = source()
        self.assertIn("def build_flujos_guiados()", src)
        self.assertIn('"flujos": build_flujos_guiados()', src)
        for chip in (
            "¿Cuál es la especialidad de la casa?",
            "¿Qué tenés para picar?",
            "Recomendame un vino",
            "¿Qué postre me recomendás?",
        ):
            self.assertIn(chip, src)

    def test_pregrabar_includes_guided_flow_audio_texts(self):
        src = source()
        self.assertIn('for flujo in build_guion_autoguiado().get("flujos", {}).values()', src)
        self.assertIn('textos.append(item["texto_tts"])', src)

    def test_quick_chips_run_guided_flow_before_llm_conversation(self):
        src = source()
        self.assertIn("state.guidedFlows", src)
        self.assertIn("async function runGuidedFlow", src)
        self.assertIn("async function runGuidedDish", src)
        self.assertIn("async function runGuidedAction", src)
        quick_start = src.index("function quickAsk(text)")
        quick_end = src.index("function toggleQuickActions", quick_start)
        quick_body = src[quick_start:quick_end]
        self.assertIn("runGuidedAction(text)", quick_body)
        self.assertIn("runGuidedFlow(text)", quick_body)
        self.assertIn("runGuidedDish(text)", quick_body)
        self.assertLess(quick_body.index("runGuidedAction(text)"), quick_body.index("converse(fallbackText, true"))
        self.assertLess(quick_body.index("runGuidedFlow(text)"), quick_body.index("converse(fallbackText, true"))
        self.assertLess(quick_body.index("runGuidedDish(text)"), quick_body.index("converse(fallbackText, true"))

    def test_guion_dishes_are_flattened_for_direct_chip_audio(self):
        src = source()
        self.assertIn("state.guidedDishes", src)
        self.assertIn("for (const cat of (guion.categorias || []))", src)
        self.assertIn("state.guidedDishes[p.chip] = p", src)

    def test_guided_dish_chip_adds_by_fixed_dish_id(self):
        src = source()
        self.assertIn("function addGuidedDishToCart(dishId, variant)", src)
        start = src.index("async function runGuidedDish")
        end = src.index("function stopCurrentAudio", start)
        body = src[start:end]
        self.assertIn("addGuidedDishToCart(dish.dish_id)", body)
        self.assertNotIn("converse(", body)
        self.assertNotIn("cvDishesIn", body)

    def test_guided_more_options_is_local_not_llm(self):
        src = source()
        self.assertIn("async function runGuidedMoreOptions", src)
        start = src.index("async function runGuidedMoreOptions")
        end = src.index("function stopCurrentAudio", start)
        body = src[start:end]
        self.assertIn("state.guidedMorePool", body)
        self.assertIn("playGuidedDishBatch", body)
        self.assertNotIn("converse(", body)
        self.assertNotIn("/chat/stream", body)

    def test_memory_welcome_does_not_enter_common_conversation(self):
        src = source()
        welcome_start = src.index("async function cvWelcome")
        welcome_end = src.index("function cvGreetGeneric", welcome_start)
        welcome_body = src[welcome_start:welcome_end]
        self.assertIn("cvGreetKnown(c)", welcome_body)
        self.assertNotIn("converse('Hola'", welcome_body)

    def test_guided_chat_response_cache_is_disabled(self):
        src = source()
        self.assertIn("def _resp_cache_on() -> bool:", src)
        cache_on_start = src.index("def _resp_cache_on() -> bool:")
        cache_on_end = src.index("def _resp_cache_key", cache_on_start)
        self.assertIn("return False", src[cache_on_start:cache_on_end])

    def test_conversation_no_longer_generates_chips_from_description_matches(self):
        src = source()
        conv_start = src.index("async function converse")
        conv_end = src.index("function sleep", conv_start)
        conv_body = src[conv_start:conv_end]
        self.assertNotIn("cvDishesIn(finalVisible)", conv_body)
        self.assertNotIn("named.slice(0, 3).map", conv_body)


if __name__ == "__main__":
    unittest.main()
