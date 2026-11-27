"""Render the ZAYRON-X email wordmark PNG (transparent, email-client safe, < 15 KB).

Inline SVG is stripped by Gmail/Outlook, so transactional mail references this
raster asset hosted at https://zayron-x.co/brand/zayron-email-logo.png.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join("apps", "web", "public", "brand", "zayron-email-logo.png")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

SCALE = 3
TEXT = "ZAYRON-X"
FONT_SIZE = 44 * SCALE
TRACKING = 1.5 * SCALE

font_candidates = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\calibrib.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
font = None
for candidate in font_candidates:
    if os.path.exists(candidate):
        font = ImageFont.truetype(candidate, FONT_SIZE)
        break
if font is None:
    raise SystemExit("No TrueType font found")

# Measure
probe = Image.new("RGBA", (10, 10))
pdraw = ImageDraw.Draw(probe)
widths = [pdraw.textlength(ch, font=font) for ch in TEXT]
text_w = int(sum(widths) + TRACKING * (len(TEXT) - 1))
bbox = pdraw.textbbox((0, 0), TEXT, font=font)
text_h = bbox[3] - bbox[1]

PAD_X = 10 * SCALE
BAR_W = 4 * SCALE
BAR_GAP = 12 * SCALE
W = PAD_X + BAR_W + BAR_GAP + text_w + PAD_X
H = text_h + 18 * SCALE

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

WHITE = (255, 255, 255, 255)
ORANGE = (255, 77, 0, 255)

# Orange accent bar (the brand perimeter rule).
draw.rectangle([PAD_X, 6 * SCALE, PAD_X + BAR_W, H - 6 * SCALE], fill=ORANGE)

# Wordmark with manual tracking.
x = PAD_X + BAR_W + BAR_GAP
baseline_y = (H - text_h) // 2 - bbox[1]
for ch, w in zip(TEXT, widths):
    draw.text((x, baseline_y), ch, font=font, fill=WHITE)
    x += w + TRACKING

img = img.resize((W // SCALE, H // SCALE), Image.LANCZOS)

# Palette quantization keeps the file tiny while preserving the two brand tones.
alpha = img.getchannel("A")
quant = img.convert("RGB").quantize(colors=32, method=Image.MEDIANCUT)
quant = quant.convert("RGBA")
quant.putalpha(alpha)
quant.save(OUT, "PNG", optimize=True)

print(OUT, os.path.getsize(OUT), "bytes", quant.size)
