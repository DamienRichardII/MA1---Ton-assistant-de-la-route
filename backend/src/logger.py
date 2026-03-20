"""Structured JSON logging for MA1 backend."""
import json, time, sys, logging

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "ts": time.time(),
            "level": record.levelname,
            "msg": record.getMessage(),
            "module": record.module,
            "func": record.funcName,
        }
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)
        if hasattr(record, 'user_id'):
            log["user_id"] = record.user_id
        if hasattr(record, 'endpoint'):
            log["endpoint"] = record.endpoint
        if hasattr(record, 'duration_ms'):
            log["duration_ms"] = record.duration_ms
        return json.dumps(log)

def setup_logger(name="ma1"):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    if not logger.handlers:
        logger.addHandler(handler)
    return logger

logger = setup_logger()
