FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# [Fix imports admin/support] api.py fait `from email_service import ...` sans préfixe `src.`.
# Python doit donc trouver les modules directement dans /app/src/. On l'ajoute au PYTHONPATH.
# Sans ça : log "[WARN] Stack admin/support non chargée: No module named 'email_service'"
ENV PYTHONPATH=/app/src

EXPOSE 8000
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
