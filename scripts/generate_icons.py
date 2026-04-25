"""
One-shot script to generate Travel'D brand assets using Gemini Nano Banana.
Run with: cd /app/backend && python /app/scripts/generate_icons.py
"""
import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ENV = Path("/app/backend/.env")
load_dotenv(BACKEND_ENV)

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

OUT = Path("/app/frontend/assets/images")
OUT.mkdir(parents=True, exist_ok=True)

PROMPTS = {
    "icon.png": (
        "A modern flat mobile app icon for a travel app called 'Travel'D'. "
        "Bold terracotta orange (#E06D53) solid background with a minimal "
        "white paper airplane forming a D-shape loop. Clean, premium, rounded "
        "square icon style, no text, centered composition, simple flat vector "
        "aesthetic, sharp silhouettes, iOS-style app icon."
    ),
    "adaptive-icon.png": (
        "A minimal white paper airplane forming a D-shape loop, centered on a "
        "fully transparent background. Clean flat vector style, no text, no "
        "shadow, bold silhouette optimized for Android adaptive icon "
        "foreground. White on transparent only."
    ),
    "splash-image.png": (
        "A minimal, warm sunset travel scene: silhouette of palm trees and a "
        "distant mountain horizon against a sunset gradient (terracotta "
        "#E06D53 at top fading to deep pine green #2A4B41 at bottom). A single "
        "small white paper airplane trail cutting across the sky. No text, no "
        "logo, clean vector illustration, centered composition, poster style, "
        "9:16 portrait."
    ),
}


async def generate_one(filename: str, prompt: str):
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY missing in /app/backend/.env")
    chat = LlmChat(
        api_key=api_key,
        session_id=f"traveld-asset-{filename}",
        system_message="You generate clean mobile app brand assets.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )
    _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not images:
        raise RuntimeError(f"No image returned for {filename}")
    data = base64.b64decode(images[0]["data"])
    (OUT / filename).write_bytes(data)
    print(f"  saved {OUT / filename} ({len(data)} bytes)")


async def main():
    for fname, prompt in PROMPTS.items():
        print(f"Generating {fname}...")
        try:
            await generate_one(fname, prompt)
        except Exception as e:
            print(f"  FAILED {fname}: {e}", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
