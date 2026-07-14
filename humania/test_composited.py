"""
Test script for HUMANIA composited avatar pipeline.
Tests LivePortrait + MuseTalk + Procedural Idle engines.
"""

import asyncio
import base64
import sys
import os
import time

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))


def test_liveportrait():
    """Test LivePortrait engine loading."""
    print("\n=== Testing LivePortrait Engine ===")
    try:
        from liveportrait_engine import LivePortraitEngine
        engine = LivePortraitEngine()
        print(f"LivePortrait ready: {engine.ready}")
        print(f"Models loaded: F={engine.appearance_feature_extractor is not None}, "
              f"M={engine.motion_extractor is not None}, "
              f"W={engine.warping_module is not None}, "
              f"G={engine.spade_generator is not None}")
        return engine
    except Exception as e:
        print(f"LivePortrait error: {e}")
        return None


def test_musetalk():
    """Test MuseTalk engine loading."""
    print("\n=== Testing MuseTalk Engine ===")
    try:
        from musetalk_engine import MuseTalkEngine
        engine = MuseTalkEngine()
        print(f"MuseTalk ready: {engine.ready}")
        return engine
    except Exception as e:
        print(f"MuseTalk error: {e}")
        return None


def test_procedural_idle():
    """Test Procedural Idle engine."""
    print("\n=== Testing Procedural Idle Engine ===")
    try:
        from procedural_idle import ProceduralIdleEngine
        engine = ProceduralIdleEngine()

        # Generate a few frames
        import numpy as np
        source_image = np.zeros((256, 256, 3), dtype=np.uint8)

        for i in range(5):
            params = engine.generate_idle_frame(source_image)
            print(f"Frame {i}: breath={params['breathing_offset']:.3f}, "
                  f"blink={params['blink_ratio']:.3f}, "
                  f"yaw={params['head_yaw']:.3f}")

        print("Procedural Idle OK")
        return engine
    except Exception as e:
        print(f"Procedural Idle error: {e}")
        return None


async def test_gemini_connection():
    """Test Gemini Live API connection."""
    print("\n=== Testing Gemini Live API ===")
    try:
        from gemini_handler import GeminiLiveHandler
        handler = GeminiLiveHandler()
        await handler.connect()
        print("Gemini connected OK")
        await handler.close()
        return True
    except Exception as e:
        print(f"Gemini error: {e}")
        return False


async def test_full_pipeline():
    """Test the full composited pipeline."""
    print("\n=== Testing Full Pipeline ===")
    try:
        from avatar_pipeline import AvatarPipeline
        from liveportrait_engine import LivePortraitEngine
        from musetalk_engine import MuseTalkEngine

        # Initialize engines
        live_portrait = None
        musetalk = None

        try:
            live_portrait = LivePortraitEngine()
        except:
            print("LivePortrait not available, continuing without it")

        try:
            musetalk = MuseTalkEngine()
        except:
            print("MuseTalk not available, continuing without it")

        # Create pipeline
        pipeline = AvatarPipeline(
            session_id="test-session",
            live_portrait=live_portrait,
            musetalk=musetalk,
        )

        print("Pipeline created OK")
        print(f"  LivePortrait: {live_portrait is not None and live_portrait.ready}")
        print(f"  MuseTalk: {musetalk is not None and musetalk.ready}")

        return True
    except Exception as e:
        print(f"Pipeline error: {e}")
        return False


def main():
    print("=" * 60)
    print("HUMANIA Composited Avatar Pipeline Test")
    print("=" * 60)

    # Test individual engines
    live_portrait = test_liveportrait()
    musetalk = test_musetalk()
    idle_engine = test_procedural_idle()

    # Test async components
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    gemini_ok = loop.run_until_complete(test_gemini_connection())
    pipeline_ok = loop.run_until_complete(test_full_pipeline())

    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"LivePortrait: {'✓' if live_portrait and live_portrait.ready else '✗'}")
    print(f"MuseTalk:     {'✓' if musetalk and musetalk.ready else '✗'}")
    print(f"Idle Engine:  {'✓' if idle_engine else '✗'}")
    print(f"Gemini API:   {'✓' if gemini_ok else '✗'}")
    print(f"Full Pipeline: {'✓' if pipeline_ok else '✗'}")

    # Latency comparison
    print("\n" + "=" * 60)
    print("LATENCY COMPARISON")
    print("=" * 60)
    print("Old (CyberVerse):  ~1500ms first frame")
    print("New (Composited):  ~50ms target")
    print("  - LivePortrait:  12.8ms (head/eyes/expressions)")
    print("  - MuseTalk:       33ms (lip-sync)")
    print("  - Procedural:     <1ms (idle animation)")
    print("=" * 60)


if __name__ == "__main__":
    main()
