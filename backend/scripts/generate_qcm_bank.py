import json
import random
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
JSONL_PATH = BASE_DIR / "data" / "legifrance" / "code_de_la_route" / "articles" / "articles_2025-12-16.jsonl"
OUT_PATH = BASE_DIR / "data" / "qcm_bank.json"

random.seed(42)

# Heuristique 1 (déjà utile) : extraire des limitations du type "est limitée à : 1° 90 km/h sur les autoroutes ; ..."
RE_SPEED_LINE = re.compile(r"(\d{2,3})\s*km\s*/?\s*h", re.IGNORECASE)

def clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def make_speed_questions(doc):
    text = doc.get("text", "") or ""
    md = doc.get("metadata", {}) or {}
    article_id = md.get("article_id")
    num_article = md.get("num_article")
    url = md.get("url")
    date_version = md.get("date_version")

    t = clean(text)
    if not t:
        return []

    # On ne garde que les articles où on trouve au moins 1 vitesse
    speeds = sorted({int(m.group(1)) for m in RE_SPEED_LINE.finditer(t) if 10 < int(m.group(1)) < 200})
    if not speeds:
        return []

    # On génère 1 question par vitesse trouvée (limité pour éviter trop de doublons)
    out = []
    for sp in speeds[:3]:
        # distracteurs proches
        candidates = sorted({sp, sp-10, sp+10, sp-20, sp+20, 50, 60, 70, 80, 90, 100, 110, 130, 140})
        candidates = [c for c in candidates if 10 < c < 200]
        random.shuffle(candidates)

        # choices: on veut 4 choix dont la bonne
        choices = [sp]
        for c in candidates:
            if c != sp and len(choices) < 4:
                choices.append(c)
        if len(choices) < 4:
            continue
        random.shuffle(choices)
        answer_index = choices.index(sp)

        # prompt simple, sourcé
        q = {
            "id": f"{article_id}__speed__{sp}",
            "question": f"D’après {num_article or article_id}, quelle vitesse (en km/h) est mentionnée dans cet article ?",
            "choices": [f"{c} km/h" for c in choices],
            "answer_index": answer_index,
            "source": {
                "article_id": article_id,
                "num_article": num_article,
                "date_version": date_version,
                "url": url,
                "excerpt": t[:600] + ("…" if len(t) > 600 else ""),
            },
        }
        out.append(q)

    return out

def main():
    if not JSONL_PATH.exists():
        raise SystemExit(f"JSONL introuvable: {JSONL_PATH}")

    questions = []
    seen = set()

    with JSONL_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            doc = json.loads(line)
            for q in make_speed_questions(doc):
                if q["id"] not in seen:
                    seen.add(q["id"])
                    questions.append(q)

    # Shuffle final
    random.shuffle(questions)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[OK] Banque générée: {OUT_PATH}")
    print(f"[OK] Questions: {len(questions)}")
    if len(questions) < 40:
        print("[WARN] Moins de 40 questions. Il faut élargir le corpus (plus d’articles) ou ajouter d’autres heuristiques.")

if __name__ == "__main__":
    main()
