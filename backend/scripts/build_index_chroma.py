import json


import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]  # dossier MA1

JSONL_PATH = BASE_DIR / "data" / "legifrance" / "code_de_la_route" / "articles" / "articles_2025-12-16.jsonl"
CHROMA_DIR = BASE_DIR / "index" / "chroma_code_route"
COLLECTION_NAME = "code_de_la_route"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"



CHUNK_SIZE = 800
CHUNK_OVERLAP = 150



def chunk_text(text: str, chunk_size: int, overlap: int):
    text = (text or "").strip()
    if not text:
        return []
    chunks = []
    i = 0
    while i < len(text):
        j = min(len(text), i + chunk_size)
        chunks.append(text[i:j])
        if j == len(text):
            break
        i = max(0, j - overlap)
    return chunks


def main():
    if not JSONL_PATH.exists():
        raise SystemExit(f"JSONL introuvable: {JSONL_PATH}")

    CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False),
    )

    # reset collection (simple)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    col = client.create_collection(name=COLLECTION_NAME, metadata={"source": "legifrance"})

    model = SentenceTransformer(MODEL_NAME)

    ids, docs, metas = [], [], []

    with JSONL_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            text = obj.get("text", "")
            md = obj.get("metadata", {})
            article_id = md.get("article_id", "UNKNOWN")
             # ✅ ICI (étape 2) : skip textes vides
            if not (text or "").strip():
                continue

            for k, chunk in enumerate(chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)):
                chunk_id = f"{article_id}__{k}"
                ids.append(chunk_id)
                docs.append(chunk)
                metas.append({**md, "chunk_id": chunk_id, "chunk_index": k})

    emb = model.encode(docs, show_progress_bar=True)
    try:
        emb = emb.tolist()
    except Exception:
        pass

    batch = 256
    for i in range(0, len(ids), batch):
        col.add(
            ids=ids[i : i + batch],
            documents=docs[i : i + batch],
            metadatas=metas[i : i + batch],
            embeddings=emb[i : i + batch],
        )

    print(f"[OK] Collection '{COLLECTION_NAME}' indexée.")
    print(f"[OK] Chunks: {len(ids)}")
    print(f"[OK] Stockage: {CHROMA_DIR}")




if __name__ == "__main__":
    main()
