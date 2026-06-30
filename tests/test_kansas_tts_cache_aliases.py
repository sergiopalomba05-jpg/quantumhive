import unittest
from pathlib import Path


APP = Path(__file__).resolve().parents[1] / "agencia" / "clientes" / "kansas" / "app.py"


def source() -> str:
    return APP.read_text(encoding="utf-8")


class KansasTtsCacheAliasesTest(unittest.TestCase):
    def test_cartesia_cache_read_voices_is_configurable(self):
        src = source()
        self.assertIn("CARTESIA_CACHE_READ_VOICES", src)
        self.assertIn("def _tts_cache_read_identities()", src)

    def test_tts_checks_read_aliases_before_generating(self):
        src = source()
        self.assertIn("for cache_key in _tts_cache_keys_for_read(text):", src)
        self.assertIn("cached = await _tts_cache_get(client, cache_key)", src)
        self.assertLess(
            src.index("for cache_key in _tts_cache_keys_for_read(text):"),
            src.index("audio, used = await _tts_synth_chain(client, text)"),
        )

    def test_pregrabar_checks_read_aliases_before_regenerating(self):
        src = source()
        self.assertIn("for cache_key in _tts_cache_keys_for_read(st):", src)
        pregrabar_start = src.index("async def pregrabar")
        pregrabar_body = src[pregrabar_start:]
        self.assertLess(
            pregrabar_body.index("for cache_key in _tts_cache_keys_for_read(st):"),
            pregrabar_body.index("audio, _ = await _tts_synth_chain(client, st)"),
        )

    def test_prewarm_checks_read_aliases_before_generating_greeting(self):
        src = source()
        prewarm_start = src.index("async def _prewarm")
        prewarm_body = src[prewarm_start:]
        self.assertIn("for cache_key in _tts_cache_keys_for_read(st):", prewarm_body)
        self.assertLess(
            prewarm_body.index("for cache_key in _tts_cache_keys_for_read(st):"),
            prewarm_body.index("audio, _ = await _tts_synth_chain(client, st)"),
        )


if __name__ == "__main__":
    unittest.main()
