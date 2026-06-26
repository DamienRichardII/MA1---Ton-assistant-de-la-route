"""Model Router — Use cheaper models for simple tasks."""
import os

# Model hierarchy (cost low → high)
MODELS = {
    "fast":    os.getenv("CLAUDE_MODEL_FAST", "claude-haiku-4-5-20251001"),   # QCM generation, simple tasks
    "default": os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514"),          # Chat, vision
    "premium": os.getenv("CLAUDE_MODEL_PREMIUM", "claude-sonnet-4-20250514"), # Complex analysis
}

def get_model(task: str) -> str:
    """Return the appropriate model for the task."""
    routing = {
        "qcm_generate": "fast",
        "veille":        "fast",
        "chat":          "default",
        "vision":        "default",
        "exam_generate": "fast",
        "positioning":   "fast",
    }
    tier = routing.get(task, "default")
    return MODELS[tier]
