FROM python:3.11-slim

WORKDIR /app

# System deps for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Models cache directory
ENV MODELS_DIR=/app/models
RUN mkdir -p /app/models

EXPOSE 5151

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "5151"]
