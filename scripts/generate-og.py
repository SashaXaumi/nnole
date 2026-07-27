#!/usr/bin/env python3
"""Generate the nnole.com OG image (1200x630) in the site's editorial style."""
from PIL import Image, ImageDraw, ImageFont
# Run from the repo root: python3 scripts/generate-og.py  (needs Pillow)
# Fonts: Inter + JetBrains Mono variable TTFs from google/fonts, vendored in scripts/fonts/

W, H = 1200, 630
SS = 2  # supersample for crisp text
BG = "#f4f1ec"
FG = "#0a0a0a"
ACCENT = "#c64a2e"
MUTED = "#8a857c"
LINE = "#d9d4cb"

img = Image.new("RGB", (W * SS, H * SS), BG)
d = ImageDraw.Draw(img)

def inter(size, wght):
    f = ImageFont.truetype("scripts/fonts/Inter.ttf", size * SS)
    f.set_variation_by_axes([32, wght])
    return f

def mono(size, wght=500):
    f = ImageFont.truetype("scripts/fonts/JBMono.ttf", size * SS)
    f.set_variation_by_axes([wght])
    return f

def tracked(draw, pos, text, font, fill, tracking=0.0, anchor_y="ls"):
    """Draw text with manual letter-spacing (tracking in px, pre-supersample)."""
    x, y = pos
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill, anchor="l" + anchor_y[-1])
        w = draw.textlength(ch, font=font)
        x += w + tracking * SS
    return x

def tracked_width(draw, text, font, tracking=0.0):
    w = 0.0
    for ch in text:
        w += draw.textlength(ch, font=font)
    w += tracking * SS * (len(text) - 1)
    return w

# ── hairline frame, inset like the site's bordered sections
inset = 28 * SS
lw = max(1, SS)  # ~1px hairline at final scale
d.rectangle([inset, inset, W * SS - inset, H * SS - inset], outline=LINE, width=lw)

# ── top mono strip
m11 = mono(13)
pad = 56 * SS
top_y = 72 * SS
def spaced_caps(s):
    return s  # JetBrains Mono already reads spaced; tracking applied via tracked()
tracked(d, (pad, top_y), "EST. ∅ — NOW A CONTENT DELIVERY NETWORK", m11, MUTED, tracking=1.5, anchor_y="m")
right_label = "CDN / VR VIDEO / INVITE-ONLY"
rw = tracked_width(d, right_label, m11, 1.5)
tracked(d, (W * SS - pad - rw, top_y), right_label, m11, MUTED, tracking=1.5, anchor_y="m")

# thin rule under the strip
d.line([pad, top_y + 26 * SS, W * SS - pad, top_y + 26 * SS], fill=LINE, width=lw)

# ── giant NNOLE — last letter "erased": tilted + accent (the site's hero gag)
big = inter(252, 900)
letters = ["N", "N", "O", "L", "E"]
track_big = -12  # tight, like letter-spacing -0.05em
widths = [d.textlength(ch, font=big) for ch in letters]
total = sum(widths) + track_big * SS * (len(letters) - 1)
x = (W * SS - total) / 2
baseline = 415 * SS
for i, ch in enumerate(letters):
    if ch == "E" and i == len(letters) - 1:
        # render the falling letter on its own layer, rotate, paste
        pad_l = 60 * SS
        lw_, lh_ = int(widths[i]) + pad_l * 2, int(320 * SS)
        layer = Image.new("RGBA", (lw_, lh_), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.text((pad_l, int(lh_ * 0.62)), ch, font=big, fill=ACCENT, anchor="ls")
        layer = layer.rotate(-8, resample=Image.BICUBIC, expand=False)
        img.paste(layer, (int(x) - pad_l + 8 * SS, int(baseline - lh_ * 0.62) + 24 * SS), layer)
    else:
        d.text((x, baseline), ch, font=big, fill=FG, anchor="ls")
    x += widths[i] + track_big * SS

# ── tagline: "Content delivery for *very large* video."  (accent underline)
tag_y = 492 * SS
f_light = inter(34, 300)
f_bold = inter(34, 700)
seg1, seg2, seg3 = "Content delivery for ", "very large", " video."
w1 = d.textlength(seg1, font=f_light)
w2 = d.textlength(seg2, font=f_bold)
w3 = d.textlength(seg3, font=f_light)
tx = (W * SS - (w1 + w2 + w3)) / 2
d.text((tx, tag_y), seg1, font=f_light, fill=FG, anchor="ls")
d.text((tx + w1, tag_y), seg2, font=f_bold, fill=FG, anchor="ls")
d.line([tx + w1, tag_y + 12 * SS, tx + w1 + w2, tag_y + 12 * SS], fill=ACCENT, width=4 * SS)
d.text((tx + w1 + w2, tag_y), seg3, font=f_light, fill=FG, anchor="ls")

# ── bottom mono strip
bot_y = H * SS - 72 * SS
d.line([pad, bot_y - 26 * SS, W * SS - pad, bot_y - 26 * SS], fill=LINE, width=lw)
tracked(d, (pad, bot_y), "FORMERLY A WEBSITE ABOUT NOTHING (LONG STORY)", m11, MUTED, tracking=1.5, anchor_y="m")
url = "nnole.com"
uw = tracked_width(d, url, m11, 1.5)
tracked(d, (W * SS - pad - uw, bot_y), url, m11, ACCENT, tracking=1.5, anchor_y="m")

img = img.resize((W, H), Image.LANCZOS)
img.save("public/og.png", optimize=True)
print("saved", img.size)
