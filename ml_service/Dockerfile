FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt ./

RUN python -m pip install --no-cache-dir -r requirements.txt

COPY app.py ./
COPY models ./models

ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "exec python -m uvicorn app:app --host 0.0.0.0 --port ${PORT}"]