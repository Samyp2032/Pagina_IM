"""
Genera las voces del simulador (una sola vez, en tu PC) y las guarda en audio/.
  Espanol : Kokoro  em_alex
  Ingles  : Kokoro  af_heart
Todo corre local (usa tu GPU si hay). Solo necesita internet la primera vez, para bajar el modelo.

Uso:
  pip install kokoro soundfile numpy
  python generar_audios.py
  python generar_audios.py --prueba     # tonos de prueba, sin modelo (solo para revisar la pagina)

Si al correr sale un error que menciona "espeak", instala espeak-ng:
  https://github.com/espeak-ng/espeak-ng/releases  (el .msi de Windows)  y vuelve a correr.
"""
import re, json, hashlib, argparse, wave, struct, math
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("--prueba", action="store_true")
args = ap.parse_args()

ROOT = Path(__file__).parent
datos = (ROOT / "data.js").read_text(encoding="utf-8")
D = json.loads(re.sub(r",(\s*[\]}])", r"\1", re.search(r"const D=(\{.*\});", datos, re.S).group(1)))  # tolera comas finales

VOZ = {"es": "em_alex", "en": "af_heart"}   # <- cambia aqui las voces
LANG = {"es": "e", "en": "a"}               # codigo de idioma de Kokoro

# ---- todas las frases que el simulador dice en voz alta ----
EXP = {"es": "Amplía tu respuesta con detalles.", "en": "Please expand your answer with details."}
SHORT = {"es": "Tu respuesta fue muy corta. Intenta ampliarla.", "en": "Your answer was too short. Try to expand it."}
PRE = {"es": "Parte dos: Review and Check.", "en": "Part two: Review and Check."}
texts = {"es": set(), "en": set()}
for L in ("es", "en"):
    texts[L] |= {EXP[L], SHORT[L], PRE[L]}
for d in D["lessons"].values():
    for _, es, en in d["qs"]:
        texts["es"].add(es); texts["en"].add(en)
    texts["es"].add(f"Hazme una pregunta sobre {d['te']}.")
    texts["en"].add(f"Ask me a question about {d['tn']}.")
for _, qs in D["reviews"].values():
    for es, en in qs:
        texts["es"].add(es); texts["en"].add(en)
print(f"Frases: {len(texts['es'])} en espanol, {len(texts['en'])} en ingles")

def limpiar(t):
    """Texto tal como se lee en voz alta (la clave del manifest sigue siendo el original)."""
    t = re.sub(r"(\w+)o/a\b", r"\1o o \1a", t)          # maestro/a -> maestro o maestra
    t = t.replace("/", " o ")
    t = re.sub(r"\s*\((.*?)\)", r", \1,", t)             # (10, 20, 30) -> , 10, 20, 30,
    t = re.sub(r"([.?!])\s+", r"\1\n", t)                # una oracion por linea
    return t.strip(" ,\n")

def fid(lang, text):
    return lang + "_" + hashlib.sha1((lang + "|" + text).encode("utf-8")).hexdigest()[:10]

def tono(path, secs=0.4):
    with wave.open(str(path), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
        w.writeframes(b"".join(struct.pack("<h", int(6000 * math.sin(i / 18))) for i in range(int(22050 * secs))))

OUT = ROOT / "audio"; OUT.mkdir(exist_ok=True)
EXTS = (".mp3", ".wav", ".ogg", ".flac")
manifest = {}

# ordena: lo que este suelto en audio/ (es_xxx / en_xxx) se mueve a audio/es/ o audio/en/
for lang in ("es", "en"):
    (OUT / lang).mkdir(exist_ok=True)
for f in list(OUT.iterdir()):
    if f.is_file() and f.suffix.lower() in EXTS and f.name[:3] in ("es_", "en_"):
        f.replace(OUT / f.name[:2] / f.name)

def buscar(lang, nombre):
    for e in EXTS:
        if (OUT / lang / (nombre + e)).exists():
            return OUT / lang / (nombre + e)
    return None

for lang in ("es", "en"):
    items = [(t, OUT / lang / (fid(lang, t) + ".mp3")) for t in sorted(texts[lang])]
    pend = [(t, p) for t, p in items if not buscar(lang, p.stem)]
    print(f"{lang} -> {VOZ[lang]}: {len(items)} frases ({len(pend)} por generar)")
    if args.prueba:
        for t, p in pend: tono(p.with_suffix(".wav"))
    elif pend:
        import numpy as np, soundfile as sf
        from kokoro import KPipeline
        pipe = KPipeline(lang_code=LANG[lang])
        for i, (t, p) in enumerate(pend, 1):
            chunks = []
            for _, _, audio in pipe(limpiar(t), voice=VOZ[lang]):
                if audio is None: continue
                chunks.append(audio.cpu().numpy() if hasattr(audio, "cpu") else np.asarray(audio))
            if not chunks:
                print("  sin audio:", t); continue
            wav = np.concatenate(chunks)
            try:
                sf.write(str(p), wav, 24000, format="MP3")
            except Exception:
                sf.write(str(p.with_suffix(".wav")), wav, 24000)
            if i % 20 == 0: print(f"  {i}/{len(pend)}")
    for t, p in items:
        real = buscar(lang, p.stem)
        if real:
            manifest[lang + "|" + t] = f"audio/{lang}/{real.name}"

(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
falt = len(texts["es"]) + len(texts["en"]) - len(manifest)
print(f"Listo. Audios en {OUT} (carpetas es/ y en/). Frases sin audio: {falt}")