"""
Tests de funciones puras de procesar_leads.py.

Corre con:
    pytest directimport/agentes/mundial/tests/ -v
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from procesar_leads import (
    build_wame_link,
    clasificar,
    normalizar_telefono,
    render_mensaje,
)


class TestNormalizarTelefono:
    def test_formato_internacional_con_signos(self):
        assert normalizar_telefono("+54 11 1234-5678") == "5491112345678"

    def test_formato_local_con_cero(self):
        assert normalizar_telefono("011 1234-5678") == "5491112345678"

    def test_formato_local_con_parentesis(self):
        assert normalizar_telefono("(011) 4567-8910") == "5491145678910"

    def test_formato_internacional_con_nueve(self):
        assert normalizar_telefono("+54 9 11 1234 5678") == "5491112345678"

    def test_solo_diez_digitos(self):
        assert normalizar_telefono("1156781234") == "5491156781234"

    def test_interior_con_area_de_cuatro(self):
        assert normalizar_telefono("54 2241 567890") == "5492241567890"

    def test_ya_normalizado(self):
        assert normalizar_telefono("5491112345678") == "5491112345678"

    def test_vacio_devuelve_none(self):
        assert normalizar_telefono("") is None

    def test_solo_letras_devuelve_none(self):
        assert normalizar_telefono("invalido") is None

    def test_demasiado_corto_devuelve_none(self):
        assert normalizar_telefono("123") is None

    def test_numero_de_otro_pais_devuelve_none(self):
        # US: 11 digitos, no es AR
        assert normalizar_telefono("+1 555 123 4567") is None

    def test_none_devuelve_none(self):
        assert normalizar_telefono(None) is None


class TestClasificar:
    def test_distribuidora_es_bultos(self):
        assert clasificar("Distribuidora El Trebol", "Mayorista") == "Bultos"

    def test_mayorista_es_bultos(self):
        assert clasificar("Casa Lopez", "Mayorista de ropa") == "Bultos"

    def test_polirrubro_es_bultos(self):
        assert clasificar("Polirrubro 25 de Mayo", "Tienda") == "Bultos"

    def test_por_mayor_en_nombre_es_bultos(self):
        assert clasificar("Ropa por mayor SA", "") == "Bultos"

    def test_boutique_es_curvas(self):
        assert clasificar("Boutique Andrea", "Local de ropa") == "Curvas"

    def test_showroom_es_curvas(self):
        assert clasificar("Showroom Norte", "") == "Curvas"

    def test_regaleria_es_curvas(self):
        assert clasificar("Regaleria Don Pepe", "Regaleria") == "Curvas"

    def test_casa_de_deportes_es_curvas(self):
        assert clasificar("Sport Center", "Casa de deportes") == "Curvas"

    def test_sin_keywords_es_dudoso(self):
        assert clasificar("Comercial XYZ", "Empresa") == "Dudoso"

    def test_keywords_de_ambas_listas_es_dudoso(self):
        # "Mayorista" (Bultos) + "Boutique" (Curvas) → Dudoso
        assert clasificar("Mayorista Boutique Chic", "") == "Dudoso"


class TestRenderMensaje:
    def test_bultos_interpola_nombre(self):
        msg = render_mensaje("Bultos", "Pepe")
        assert "Hola Pepe" in msg
        assert "bulto cerrado de 300" in msg

    def test_curvas_interpola_nombre(self):
        msg = render_mensaje("Curvas", "Comercial Andrea")
        assert "Hola Comercial Andrea" in msg
        assert "USD 120" in msg

    def test_segmento_invalido_lanza_error(self):
        import pytest

        with pytest.raises(ValueError):
            render_mensaje("Otro", "Pepe")

    def test_bultos_sin_acentos(self):
        # acentos rompen en celus viejos; el output debe ser ASCII-friendly
        msg = render_mensaje("Bultos", "Pepe")
        # caracteres con acento mas comunes
        assert "á" not in msg
        assert "é" not in msg
        assert "ó" not in msg
        assert "ñ" not in msg


class TestBuildWameLink:
    def test_link_basico(self):
        link = build_wame_link("5491112345678", "hola")
        assert link == "https://wa.me/5491112345678?text=hola"

    def test_link_con_espacios_codificados(self):
        link = build_wame_link("5491112345678", "hola mundo")
        # urllib.parse.quote codifica espacios como %20
        assert "%20" in link or "+" in link

    def test_link_con_signo_de_pregunta_codificado(self):
        link = build_wame_link("5491112345678", "como va?")
        assert "%3F" in link
