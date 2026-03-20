import json
from pathlib import Path

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

BASE_DIR = Path(__file__).resolve().parents[1]

# ✅ ton JSONL complet
JSONL_PATH = BASE_DIR / "data" / "legifrance" / "code_de_la_route" / "articles" / "articles_full_LEGITEXT000006074228_2025-12-18.jsonl"
CHROMA_DIR = BASE_DIR / "index" / "chroma_code_route"
COLLECTION_NAME = "code_de_la_route_onnx"  # nouveau nom pour éviter conflits

CHUNK_SIZE = 700
CHUNK_OVERLAP = 120
BATCH = 128


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

    # Embeddings ONNX (évite torch)
    ef = embedding_functions.DefaultEmbeddingFunction()

    # Collection (recréée proprement)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    col = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"source": "legifrance"},
        embedding_function=ef,
    )

    ids, docs, metas = [], [], []
    added = 0
    skipped_empty = 0

    with JSONL_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            text = obj.get("text", "")
            if not (text or "").strip():
                skipped_empty += 1
                continue

            md = obj.get("metadata", {}) or {}
            article_id = md.get("article_id", "UNKNOWN")

            for k, chunk in enumerate(chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)):
                chunk_id = f"{article_id}__{k}"
                ids.append(chunk_id)
                docs.append(chunk)
                metas.append({**md, "chunk_id": chunk_id, "chunk_index": k})

                if len(ids) >= BATCH:
                    col.add(ids=ids, documents=docs, metadatas=metas)
                    added += len(ids)
                    ids, docs, metas = [], [], []

    if ids:
        col.add(ids=ids, documents=docs, metadatas=metas)
        added += len(ids)

    print(f"[OK] Collection: {COLLECTION_NAME}")
    print(f"[OK] Chunks ajoutés: {added}")
    print(f"[OK] Articles textes vides ignorés: {skipped_empty}")
    print(f"[OK] Stockage: {CHROMA_DIR}")


if __name__ == "__main__":
    main()
