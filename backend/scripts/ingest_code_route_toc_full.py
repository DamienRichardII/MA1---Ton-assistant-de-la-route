from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

# --- Constantes ---
TEXT_ID_CODE_ROUTE = "LEGITEXT000006074228"
SOURCE = "legifrance"
DOC_TYPE = "code_de_la_route"

SLEEP_BETWEEN_CALLS_S = 0.12
SAVE_RAW_ARTICLE = True  # garde la réponse brute au début (debug)


def api_root(env: str) -> str:
    env = (env or "sandbox").strip().lower()
    if env == "prod":
        return "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app"
    return "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app"


def oauth_url(env: str) -> str:
    env = (env or "sandbox").strip().lower()
    if env == "prod":
        return "https://oauth.piste.gouv.fr/api/oauth/token"
    return "https://sandbox-oauth.piste.gouv.fr/api/oauth/token"


def build_legifrance_article_url(article_id: str) -> str:
    return f"https://www.legifrance.gouv.fr/codes/article_lc/{article_id}"


def ensure_dirs(run_date: str) -> Tuple[Path, Path, Path]:
    BASE_DIR = Path(__file__).resolve().parents[1]   # dossier MA1
    base = BASE_DIR / "data" / SOURCE / DOC_TYPE
    toc_dir = base / "toc"
    art_dir = base / "articles" / run_date
    toc_dir.mkdir(parents=True, exist_ok=True)
    art_dir.mkdir(parents=True, exist_ok=True)
    return base, toc_dir, art_dir


@retry(stop=stop_after_attempt(5), wait=wait_exponential(min=1, max=20))
def get_token(env: str, client_id: str, client_secret: str, timeout_s: int = 30) -> str:
    r = requests.post(
        oauth_url(env),
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "openid",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        timeout=timeout_s,
    )
    r.raise_for_status()
    return r.json()["access_token"]


@retry(stop=stop_after_attempt(5), wait=wait_exponential(min=1, max=20))
def post_json(url: str, token: str, payload: Dict[str, Any], timeout_s: int = 45) -> Dict[str, Any]:
    r = requests.post(
        url,
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        timeout=timeout_s,
    )
    r.raise_for_status()
    return r.json()


def iter_json(x: Any) -> Iterable[Any]:
    if isinstance(x, dict):
        yield x
        for v in x.values():
            yield from iter_json(v)
    elif isinstance(x, list):
        for i in x:
            yield from iter_json(i)


def extract_all_article_ids(toc_json: Dict[str, Any]) -> List[str]:
    """
    Extraction robuste: on parcourt tout le JSON et on récupère toutes les chaînes "LEGIARTI..."
    """
    ids: Set[str] = set()
    for node in iter_json(toc_json):
        if isinstance(node, dict):
            for v in node.values():
                if isinstance(v, str) and v.startswith("LEGIARTI"):
                    ids.add(v)
    return sorted(ids)


def pick_text(raw_article: Dict[str, Any]) -> str:
    a = raw_article.get("article")
    if not isinstance(a, dict):
        a = {}
    candidates = [
        a.get("texte"),
        raw_article.get("texte"),
        raw_article.get("content"),
    ]
    for c in candidates:
        if isinstance(c, str) and c.strip():
            return c.strip()
    return ""



def pick_num_article(raw_article: Dict[str, Any]) -> str:
    a = raw_article.get("article")
    if not isinstance(a, dict):
        a = {}
    candidates = [
        a.get("num"),
        raw_article.get("num"),
        raw_article.get("articleNum"),
        a.get("titre"),
        raw_article.get("titre"),
    ]
    for c in candidates:
        if isinstance(c, str) and c.strip():
            return c.strip()
    return ""



def pick_date_version(raw_article: Dict[str, Any]) -> str:
    a = raw_article.get("article")
    if not isinstance(a, dict):
        a = {}
    candidates = [
        a.get("dateDebut"),
        raw_article.get("dateDebut"),
        raw_article.get("date"),
    ]
    for c in candidates:
        if isinstance(c, str) and c.strip():
            return c.strip()
    return datetime.now(timezone.utc).date().isoformat()



def main() -> None:
    load_dotenv()

    env = os.getenv("PISTE_ENV", "sandbox").strip().lower()
    client_id = os.getenv("PISTE_CLIENT_ID", "").strip()
    client_secret = os.getenv("PISTE_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        raise SystemExit("PISTE_CLIENT_ID / PISTE_CLIENT_SECRET manquants dans .env")

    base_api = api_root(env)
    url_toc = f"{base_api}/consult/code/tableMatieres"
    url_get_article = f"{base_api}/consult/getArticle"

    run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    base_dir, toc_dir, art_dir = ensure_dirs(run_date)

    token = get_token(env, client_id, client_secret)

    # --- 1) Table des matières (TOC) ---
    toc_payload = {
        "textId": TEXT_ID_CODE_ROUTE,
        "date": datetime.now(timezone.utc).isoformat(),
    }

    try:
        toc = post_json(url_toc, token, toc_payload)
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code in (401, 403):
            token = get_token(env, client_id, client_secret)
            toc = post_json(url_toc, token, toc_payload)
        else:
            raise

    toc_path = toc_dir / f"toc_{TEXT_ID_CODE_ROUTE}_{run_date}.json"
    toc_path.write_text(json.dumps(toc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] TOC sauvegardée: {toc_path}")

    # --- 2) Extraction de tous les articles ---
    article_ids = extract_all_article_ids(toc)
    print(f"[OK] Articles détectés dans TOC: {len(article_ids)}")

    if not article_ids:
        print("[WARN] Aucun LEGIARTI trouvé dans la TOC. (Structure API différente ?)")
        return

    # --- 3) Téléchargement de tous les articles ---
    jsonl_path = base_dir / "articles" / f"articles_full_{TEXT_ID_CODE_ROUTE}_{run_date}.jsonl"
    saved = 0
    empty_text = 0

    with jsonl_path.open("w", encoding="utf-8") as f:
        for article_id in tqdm(article_ids, desc="Téléchargement (TOC->Articles)"):
            payload = {"id": article_id}

            try:
                raw = post_json(url_get_article, token, payload)
            except requests.HTTPError as e:
                if e.response is not None and e.response.status_code in (401, 403):
                    token = get_token(env, client_id, client_secret)
                    raw = post_json(url_get_article, token, payload)
                else:
                    raise

            text = pick_text(raw)
            if not text:
                empty_text += 1

            doc = {
                "text": text,
                "metadata": {
                    "source": SOURCE,
                    "type": DOC_TYPE,
                    "article_id": article_id,
                    "num_article": pick_num_article(raw),
                    "date_version": pick_date_version(raw),
                    "url": build_legifrance_article_url(article_id),
                    "text_id": TEXT_ID_CODE_ROUTE,
                    "run_date": run_date,
                },
            }
            if SAVE_RAW_ARTICLE:
                doc["raw"] = raw

            # 1 fichier par article (dans un sous-dossier daté)
            (art_dir / f"{article_id}.json").write_text(
                json.dumps(doc, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            # JSONL global
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")
            saved += 1

            time.sleep(SLEEP_BETWEEN_CALLS_S)

    summary = {
        "run_date": run_date,
        "env": env,
        "text_id": TEXT_ID_CODE_ROUTE,
        "articles_total": len(article_ids),
        "articles_saved": saved,
        "articles_empty_text": empty_text,
        "toc_file": str(toc_path),
        "jsonl_file": str(jsonl_path),
        "articles_dir": str(art_dir),
    }
    (base_dir / "articles" / f"ingest_full_summary_{run_date}.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"[OK] Articles sauvegardés: {saved}")
    print(f"[OK] Textes vides: {empty_text}")
    print(f"[OK] Dossier articles: {art_dir}")
    print(f"[OK] Export JSONL: {jsonl_path}")


if __name__ == "__main__":
    main()
