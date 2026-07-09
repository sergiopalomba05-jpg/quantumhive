import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEMO_DIR = ROOT / "agencia" / "clientes" / "carta-viva-premium-demo"
APP = DEMO_DIR / "app.py"


def source() -> str:
    if not APP.exists():
        raise AssertionError("premium demo app.py should exist")
    return APP.read_text(encoding="utf-8")


def embedded_menu() -> dict:
    src = source()
    match = re.search(r'EMBEDDED_MENU_JSON = r"""([\s\S]*?)"""', src)
    if not match:
        raise AssertionError("EMBEDDED_MENU_JSON not found")
    return json.loads(match.group(1))


class CartaVivaPremiumDemoVisualTest(unittest.TestCase):
    def test_demo_app_exists_as_isolated_kansas_copy(self):
        self.assertTrue(APP.exists(), "premium demo app.py should exist")
        self.assertTrue((DEMO_DIR / "requirements.txt").exists())
        self.assertTrue((DEMO_DIR / "Dockerfile").exists())

    def test_menu_has_short_visual_contract_with_featured_images(self):
        menu = embedded_menu()
        self.assertEqual(menu["_meta"]["restaurant_id"], "carta-viva-premium-demo")
        items = [item for group in ("menu", "drinks") for sec in menu.get(group, []) for item in sec.get("items", [])]
        self.assertGreaterEqual(len(items), 8)
        self.assertLessEqual(len(items), 16)
        visual_items = [item for item in items if item.get("image_url") and item.get("image_alt")]
        self.assertEqual(len(visual_items), len(items))
        self.assertGreaterEqual(sum(1 for item in items if item.get("featured")), 4)
        self.assertTrue(any(item.get("badge") for item in items))

    def test_renderer_uses_photo_cards_and_featured_rail(self):
        src = source()
        for token in (
            "dish-card",
            "dish-media",
            "dish-img",
            "dish-badge",
            "featured-rail",
            "featured-card",
            "renderFeaturedRail",
            "it.image_url",
            "loading = 'lazy'",
        ):
            self.assertIn(token, src)

    def test_motion_is_native_accessible_and_reduced_motion_safe(self):
        src = source()
        self.assertIn("IntersectionObserver", src)
        self.assertIn("scroll-snap-type", src)
        self.assertIn("prefers-reduced-motion", src)
        self.assertNotIn("gsap", src.lower())
        self.assertNotIn("swiper", src.lower())
        self.assertNotIn("lenis", src.lower())


if __name__ == "__main__":
    unittest.main()
