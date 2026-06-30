import unittest
from pathlib import Path


APP = Path(__file__).resolve().parents[1] / "agencia" / "clientes" / "kansas" / "app.py"


def source() -> str:
    return APP.read_text(encoding="utf-8")


class KansasSttResilienceTest(unittest.TestCase):
    def test_stt_rotates_all_gemini_keys_before_busy(self):
        src = source()
        self.assertIn("def _gemini_stt_key_order() -> List[str]:", src)
        stt_start = src.index("async def stt")
        stt_end = src.index("@app.post(\"/feedback\")", stt_start)
        stt_body = src[stt_start:stt_end]
        self.assertIn("for key in _gemini_stt_key_order():", stt_body)
        self.assertIn("last_status = r.status_code", stt_body)
        self.assertIn("if last_status == 429:", stt_body)
        self.assertLess(
            stt_body.index("for key in _gemini_stt_key_order():"),
            stt_body.index("return {\"text\": \"\", \"busy\": True}"),
        )

    def test_frontend_busy_copy_asks_to_retry_now(self):
        src = source()
        self.assertNotIn("Estoy muy ocupada, esperá un segundo y volvé a intentarlo", src)
        self.assertIn("No pude transcribir ese audio, probá otra vez", src)


if __name__ == "__main__":
    unittest.main()
