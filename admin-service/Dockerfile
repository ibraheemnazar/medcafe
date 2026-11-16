FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/* && pip install --no-cache-dir -r requirements.txt && groupadd -g 10001 cafe && useradd -u 10001 -g cafe -M cafe
COPY app.py wsgi.py menu_images.py prepare_existing.py ./
COPY templates ./templates
COPY static ./static
USER 10001:10001
EXPOSE 8788
CMD ["gunicorn", "--bind", "0.0.0.0:8788", "--workers", "2", "--threads", "2", "--timeout", "240", "--access-logfile", "-", "wsgi:app"]
