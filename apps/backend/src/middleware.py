"""Request timing middleware + structured logging."""
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("ma1")

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = round((time.time() - start) * 1000, 1)
        logger.info(
            f"{request.method} {request.url.path} {response.status_code} {duration}ms",
            extra={
                "endpoint": request.url.path,
                "method": request.method,
                "status": response.status_code,
                "duration_ms": duration,
                "user_agent": request.headers.get("user-agent", "")[:100],
            }
        )
        response.headers["X-Process-Time"] = str(duration)
        return response
