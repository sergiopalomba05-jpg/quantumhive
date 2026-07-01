import unittest
from pathlib import Path


APP = Path(__file__).resolve().parents[1] / "agencia" / "clientes" / "kansas" / "app.py"


def source() -> str:
    return APP.read_text(encoding="utf-8")


class KansasSttResilienceTest(unittest.TestCase):
    def test_stt_uses_deepinfra_first_with_gemini_as_fallback(self):
        src = source()
        self.assertIn("STT_CHAIN", src)
        self.assertIn("DEEPINFRA_STT_MODEL", src)
        self.assertIn("async def _deepinfra_stt", src)
        self.assertIn("async def _gemini_stt", src)
        stt_start = src.index("async def stt")
        stt_end = src.index("@app.post(\"/feedback\")", stt_start)
        stt_body = src[stt_start:stt_end]
        self.assertIn("for provider in STT_CHAIN_PARSED:", stt_body)
        self.assertIn("if provider == \"deepinfra\":", stt_body)
        self.assertIn("elif provider == \"gemini\":", stt_body)
        self.assertLess(
            stt_body.index("if provider == \"deepinfra\":"),
            stt_body.index("elif provider == \"gemini\":"),
        )
        self.assertLess(
            stt_body.index("for provider in STT_CHAIN_PARSED:"),
            stt_body.index("return {\"text\": \"\", \"busy\": True}"),
        )

    def test_frontend_busy_copy_asks_to_retry_now(self):
        src = source()
        self.assertNotIn("Estoy muy ocupada, esperá un segundo y volvé a intentarlo", src)
        self.assertIn("No pude transcribir ese audio, probá otra vez", src)


if __name__ == "__main__":
    unittest.main()
