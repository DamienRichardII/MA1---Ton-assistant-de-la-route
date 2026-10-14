"""Garde-fous de sécurité : limitation de débit par IP et verrouillage après échecs (en mémoire)."""
import time
from collections import defaultdict, deque
from typing import Callable, Deque, Dict

from fastapi import HTTPException, Request

_hits: Dict[str, Deque[float]] = defaultdict(deque)
_fails: Dict[str, Deque[float]] = defaultdict(deque)
_MAX_KEYS = 20000


def client_ip(request: Request) -> str:
    """IP réelle derrière le proxy Railway (premier élément de X-Forwarded-For)."""
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _prune(store: Dict[str, Deque[float]], now: float, window: float) -> None:
    if len(store) < _MAX_KEYS:
        return
    for k in [k for k, q in store.items() if not q or now - q[-1] > window]:
        store.pop(k, None)
    if len(store) >= _MAX_KEYS:  # dernier recours : borne dure
        store.clear()


def rate_limit(name: str, limit: int, window: int = 60) -> Callable:
    """Dépendance FastAPI : `limit` requêtes max par IP et par fenêtre de `window` secondes."""
    def dep(request: Request) -> None:
        now = time.time()
        key = f"{name}:{client_ip(request)}"
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(429, {"error": "rate_limited", "message": "Trop de requêtes, réessayez dans un instant."},
                                headers={"Retry-After": str(window)})
        q.append(now)
        _prune(_hits, now, window)
    return dep


def check_lockout(key: str, max_fails: int = 5, window: int = 900) -> None:
    now = time.time()
    q = _fails[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= max_fails:
        raise HTTPException(429, "Trop de tentatives. Réessayez dans 15 minutes.", headers={"Retry-After": str(window)})


def record_failure(key: str, window: int = 900) -> None:
    now = time.time()
    _fails[key].append(now)
    _prune(_fails, now, window)


def clear_failures(key: str) -> None:
    _fails.pop(key, None)
