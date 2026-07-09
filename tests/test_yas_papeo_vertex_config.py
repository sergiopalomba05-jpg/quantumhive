import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BOT_DIR = ROOT / "agencia" / "clientes" / "yas-papeo"
APP = BOT_DIR / "app.py"
ENV_EXAMPLE = BOT_DIR / ".env.ejemplo"
README = BOT_DIR / "README.md"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class YasPapeoVertexConfigTest(unittest.TestCase):
    def test_app_supports_vertex_without_ai_studio_api_key(self):
        source = read(APP)
        self.assertIn("USE_VERTEX_AI", source)
        self.assertIn("GOOGLE_GENAI_USE_VERTEXAI", source)
        self.assertIn("GOOGLE_CLOUD_PROJECT", source)
        self.assertIn("GOOGLE_CLOUD_LOCATION", source)
        self.assertIn("genai.Client(vertexai=True", source)
        self.assertNotIn('GEMINI_API_KEY: str = os.environ["GEMINI_API_KEY"]', source)

    def test_app_suppresses_httpx_info_logs_to_avoid_token_leaks(self):
        source = read(APP)
        self.assertIn('logging.getLogger("httpx").setLevel(logging.WARNING)', source)

    def test_app_strips_secret_environment_values(self):
        source = read(APP)
        self.assertIn('os.environ["TELEGRAM_BOT_TOKEN"].strip()', source)
        self.assertIn('os.environ.get("TELEGRAM_WEBHOOK_SECRET", "").strip()', source)

    def test_app_uses_cartesia_for_fast_tts_when_configured(self):
        source = read(APP)
        self.assertIn("CARTESIA_API_KEY", source)
        self.assertIn("CARTESIA_VOICE_ID", source)
        self.assertIn("https://api.cartesia.ai/tts/bytes", source)
        self.assertIn("Cartesia-Version", source)
        self.assertIn("sonic-3.5", source)
        self.assertIn('"container": "raw"', source)
        self.assertIn('"encoding": "pcm_s16le"', source)
        self.assertIn('"sample_rate": 24000', source)
        self.assertIn('return await response.read(), "audio/pcm"', source)

    def test_ffmpeg_uses_fast_opus_settings(self):
        source = read(APP)
        self.assertIn('"-b:a", "32k"', source)
        self.assertIn('"-compression_level", "0"', source)

    def test_app_processes_updates_concurrently(self):
        source = read(APP)
        self.assertIn(".concurrent_updates(True)", source)

    def test_app_logs_audio_stage_timings(self):
        source = read(APP)
        self.assertIn("audio timing chat_id=%d stage=%s", source)

    def test_app_sends_chunked_telegram_voice_replies(self):
        source = read(APP)
        self.assertIn("VOICE_REPLY_CHUNK_MAX_CHARS", source)
        self.assertIn("def _voice_reply_chunks", source)
        self.assertIn("audio_chunks = _voice_reply_chunks(", source)
        self.assertIn("for chunk_index, audio_text in enumerate(audio_chunks, start=1):", source)
        self.assertIn('log_stage(f"tts_chunk_{chunk_index}")', source)
        self.assertIn('log_stage(f"ffmpeg_chunk_{chunk_index}")', source)
        self.assertIn('log_stage(f"send_voice_chunk_{chunk_index}")', source)

    def test_app_has_channel_agnostic_reply_options(self):
        source = read(APP)
        for text in (
            "@dataclass(frozen=True)",
            "class ReplyOption",
            "class ModelReply",
            "cached_audio_key",
            "MAX_CONTEXTUAL_CHIPS = 4",
            "OPTION_BY_ID",
            "def _telegram_keyboard",
            "chat_dynamic_options",
            "Ver precio y duración",
            "Quiero otra opción",
            "Atención más personalizada",
        ):
            self.assertIn(text, source)

    def test_app_uses_diagnostic_phases_for_chips(self):
        source = read(APP)
        for text in (
            "def _parse_model_reply",
            "def _store_dynamic_options",
            "response_mime_type=\"application/json\"",
            "chips[:MAX_CONTEXTUAL_CHIPS]",
        ):
            self.assertIn(text, source)
        self.assertNotIn("DIAGNOSIS_DETAIL_OPTIONS", source)
        self.assertNotIn("RECOMMENDATION_OPTIONS =", source)
        self.assertNotIn("PRICE_OPTIONS =", source)

    def test_app_does_not_offer_audio_or_human_wording_as_chips(self):
        source = read(APP)
        self.assertNotIn("Explicamelo por audio", source)
        self.assertNotIn("Explícamelo por audio", source)
        self.assertNotIn("Asesoría humana", source)
        self.assertIn("Atención más personalizada", source)

    def test_app_sanitizes_forbidden_price_tokens_before_sending(self):
        source = read(APP)
        for text in (
            "FORBIDDEN_PRICE_REPLACEMENTS",
            "def _sanitize_outgoing_text",
            "_sanitize_outgoing_text(parsed.message)",
        ):
            self.assertIn(text, source)

    def test_app_sanitizes_identity_phrases_and_tts_pronunciation(self):
        source = read(APP)
        for text in (
            "IDENTITY_REPLACEMENTS",
            "Soy de Jaspapeobeauty",
            "def _prepare_tts_text",
            "PRONUNCIATION_REPLACEMENTS",
            "Ciplex",
            "formól",
            "trankilas",
            '(r"ll", "y")',
            "_prepare_tts_text(URL_RE.sub(URL_AUDIO_PLACEHOLDER, reply_text))",
        ):
            self.assertIn(text, source)

    def test_app_uses_business_name_in_welcome(self):
        source = read(APP)
        self.assertIn("Bienvenida a Jaspapeobeauty - Belleza Capilar", source)
        self.assertNotIn("Bienvenida a Yas Papeo", source)

    def test_prompt_requires_structured_phase_flow_and_optional_chips(self):
        prompt = read(ROOT / "agencia" / "clientes" / "yas-papeo" / "system_prompt.md")
        for text in (
            "Flujo obligatorio por fases",
            "bienvenida",
            "diagnostico",
            "recomendacion",
            "precio, duracion y seña",
            "turno o atencion mas personalizada",
            "Responde siempre en JSON valido",
            "chips",
            "maximo 4",
            "Los chips son opcionales",
            "Nunca empieces una respuesta con soy",
            "Te dejo agendada para que una persona de nuestro equipo se contacte con vos a la brevedad",
        ):
            self.assertIn(text, prompt)
        self.assertNotIn("Sos la voz", prompt)
        self.assertNotIn("soy la voz", prompt.lower())

    def test_prompt_uses_business_name_and_requires_deposit_on_turns(self):
        prompt = read(ROOT / "agencia" / "clientes" / "yas-papeo" / "system_prompt.md")
        self.assertIn("Jaspapeobeauty - Belleza Capilar", prompt)
        self.assertNotIn("Yas Papeo - Belleza Capilar", prompt)
        self.assertNotIn("Solo hablas de Yas Papeo", prompt)
        self.assertIn("Si la clienta pide turno", prompt)
        self.assertIn("menciona siempre la seña", prompt)

    def test_app_renders_telegram_chips_and_handles_callbacks(self):
        source = read(APP)
        for text in (
            "CallbackQueryHandler",
            "InlineKeyboardButton",
            "InlineKeyboardMarkup",
            "async def handle_option",
            "await query.answer()",
            "reply_markup=_telegram_keyboard(DIAGNOSIS_START_OPTIONS)",
            "next_options",
            "ptb_app.add_handler(CallbackQueryHandler(handle_option",
        ):
            self.assertIn(text, source)

    def test_app_does_not_show_same_chips_after_every_reply(self):
        source = read(APP)
        self.assertNotIn("reply_markup=_telegram_keyboard(DIAGNOSTIC_OPTIONS)", source)
        self.assertNotIn("Si querés, podés tocar una opción para seguir", source)

    def test_docs_describe_cloud_run_vertex_deploy(self):
        env_example = read(ENV_EXAMPLE)
        readme = read(README)
        for text in (
            "GOOGLE_GENAI_USE_VERTEXAI=true",
            "GOOGLE_CLOUD_PROJECT=project-aa5fb956-b08a-4e13-869",
            "GOOGLE_CLOUD_LOCATION=us-central1",
        ):
            self.assertIn(text, env_example)
            self.assertIn(text, readme)
        self.assertIn("roles/aiplatform.user", readme)
        self.assertIn("--min-instances=1", readme)
        self.assertIn("--no-cpu-throttling", readme)


if __name__ == "__main__":
    unittest.main()
