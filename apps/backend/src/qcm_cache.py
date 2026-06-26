"""QCM Server-Side Cache — Avoid redundant Claude API calls."""
import time, json, hashlib
from typing import Optional

class QCMCache:
    def __init__(self, max_size: int = 200, ttl_seconds: int = 3600):
        self._cache: dict[str, dict] = {}
        self._max_size = max_size
        self._ttl = ttl_seconds

    def _key(self, topic: str, difficulty: str, n: int) -> str:
        return hashlib.md5(f"{topic}:{difficulty}:{n}".encode()).hexdigest()

    def get(self, topic: str, difficulty: str, n: int) -> Optional[list]:
        key = self._key(topic, difficulty, n)
        entry = self._cache.get(key)
        if not entry:
            return None
        if time.time() - entry["ts"] > self._ttl:
            del self._cache[key]
            return None
        # Pop and return (each set used only once)
        questions = entry["sets"].pop(0)
        if not entry["sets"]:
            del self._cache[key]
        return questions

    def put(self, topic: str, difficulty: str, n: int, questions: list):
        key = self._key(topic, difficulty, n)
        entry = self._cache.setdefault(key, {"ts": time.time(), "sets": []})
        entry["sets"].append(questions)
        entry["ts"] = time.time()
        # Evict oldest if over limit
        if len(self._cache) > self._max_size:
            oldest_key = min(self._cache, key=lambda k: self._cache[k]["ts"])
            del self._cache[oldest_key]

    @property
    def size(self):
        return sum(len(e["sets"]) for e in self._cache.values())

qcm_cache = QCMCache()
