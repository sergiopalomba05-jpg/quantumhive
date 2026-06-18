import importlib, os


def test_config_lee_env_y_defaults(tmp_path, monkeypatch):
    cliente = tmp_path / "cliente"
    (cliente / "datos").mkdir(parents=True)
    (cliente / ".env").write_text(
        "TELEGRAM_TOKEN=tok123\nGEMINI_API_KEY=key456\n", encoding="utf-8")
    monkeypatch.setenv("CATAHOME_CLIENT_DIR", str(cliente))
    # asegurar que no haya valores heredados del entorno real
    for v in ["TELEGRAM_TOKEN", "GEMINI_API_KEY", "MODEL_CHAT"]:
        monkeypatch.delenv(v, raising=False)

    import config
    importlib.reload(config)

    assert config.Config.TELEGRAM_TOKEN == "tok123"
    assert config.Config.GEMINI_API_KEY == "key456"
    assert config.Config.MODEL_CHAT  # default no vacío
    assert config.validar() == []


def test_config_reporta_faltantes(tmp_path, monkeypatch):
    cliente = tmp_path / "cliente2"
    (cliente / "datos").mkdir(parents=True)
    (cliente / ".env").write_text("", encoding="utf-8")
    monkeypatch.setenv("CATAHOME_CLIENT_DIR", str(cliente))
    for v in ["TELEGRAM_TOKEN", "GEMINI_API_KEY"]:
        monkeypatch.delenv(v, raising=False)

    import config
    importlib.reload(config)
    faltan = config.validar()
    assert "TELEGRAM_TOKEN" in faltan and "GEMINI_API_KEY" in faltan
