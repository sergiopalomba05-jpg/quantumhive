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
        quick_start = src.index("function quickAsk(text)")
        quick_end = src.index("function toggleQuickActions", quick_start)
        quick_body = src[quick_start:quick_end]
        self.assertIn("runGuidedFlow(text)", quick_body)
        self.assertLess(quick_body.index("runGuidedFlow(text)"), quick_body.index("converse(text, true"))


if __name__ == "__main__":
    unittest.main()
