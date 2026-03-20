import json
from pathlib import Path

BASE = Path("data/legifrance/code_de_la_route/articles")
# prend le dernier dossier de run (YYYY-MM-DD)
runs = sorted([p for p in BASE.iterdir() if p.is_dir()])
if not runs:
    raise SystemExit("Aucun dossier run trouvé.")

run_dir = runs[-1]
empties = []

for p in run_dir.glob("LEGIARTI*.json"):
    obj = json.loads(p.read_text(encoding="utf-8"))
    if not (obj.get("text") or "").strip():
        md = obj.get("metadata", {})
        empties.append({
            "article_id": md.get("article_id"),
            "num_article": md.get("num_article"),
            "url": md.get("url"),
        })

out = BASE / f"empty_texts_{run_dir.name}.json"
out.write_text(json.dumps(empties, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"[OK] Run: {run_dir}")
print(f"[OK] Textes vides: {len(empties)}")
print(f"[OK] Fichier: {out}")
