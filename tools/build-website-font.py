"""Regenerate the local website font with fonttools==4.60.1 and brotli==1.1.0.

Usage: python tools/build-website-font.py /verified/NotoSansSC.ttf
The frozen mini-program/runtime font and pack are not changed.
"""
import hashlib
import json
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
import fontTools
import brotli

assert fontTools.__version__ == "4.60.1" and brotli.__version__ == "1.1.0", "Use the pinned font tools"

root = pathlib.Path(__file__).resolve().parent.parent
source = pathlib.Path(sys.argv[1])
assert hashlib.sha256(source.read_bytes()).hexdigest() == "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da"
inputs = sorted((root / "website/src").rglob("*")) + [root / "platforms/status.json", root / "website/device-profiles.json"]
text = "".join(p.read_text() for p in inputs if p.is_file())
font = TTFont(source, recalcTimestamp=False)
cmap = font.getBestCmap()
required = set(range(32, 127)) | {ord(c) for c in text if 0x3400 <= ord(c) <= 0x9fff}
assert required <= cmap.keys(), "The reviewed font lacks website glyphs"
options = subset.Options()
options.flavor = "woff2"
options.recalc_timestamp = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=required | {ord(c) for c in text if ord(c) in cmap})
subsetter.subset(font)
font.flavor = "woff2"
out = root / "website/public/fonts"
out.mkdir(exist_ok=True)
path = out / "showcase-sc.woff2"
font.save(path)
digest = hashlib.sha256(path.read_bytes()).hexdigest()
size = path.stat().st_size
name = "showcase-sc-" + digest[:16] + ".woff2"
path.rename(out / name)
for previous in out.glob("showcase-sc*.woff2"):
    if previous.name != name:
        previous.unlink()
(out / "font.json").write_text(json.dumps({"fileName": name, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "sha256": digest, "size": size, "requiredCodePoints": sorted(required), "tools": {"fonttools": "4.60.1", "brotli": "1.1.0"}}, indent=2) + "\n")
(out / "OFL.txt").write_bytes((source.parent / "OFL.txt").read_bytes())
(out.parent / "fonts.css").write_text("/* Reviewed Noto Sans SC subset; see fonts/OFL.txt. */\n@font-face{font-family:'Showcase Sans';src:url('/fonts/" + name + "') format('woff2');font-weight:100 900;font-display:swap}\n")
print(json.dumps({"path": str(out / name), "size": size, "sha256": digest}))
