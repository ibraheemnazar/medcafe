FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && groupadd -g 10001 cafe && useradd -u 10001 -g cafe -M cafe
COPY app.py wsgi.py ./
COPY templates ./templates
COPY static ./static
USER 10001:10001
EXPOSE 8788
CMD ["gunicorn", "--bind", "0.0.0.0:8788", "--workers", "2", "--threads", "2", "--timeout", "90", "--access-logfile", "-", "wsgi:app"]
