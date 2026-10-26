# Empathia intelligence service (research prototype on synthetic data). NOT_RUN in the build environment.
FROM python:3.13-slim
WORKDIR /app
COPY services/intelligence-python/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY ml /app/ml
COPY services/intelligence-python /app/services/intelligence-python
RUN useradd --create-home --uid 10002 intel
USER 10002
WORKDIR /app/services/intelligence-python
EXPOSE 4300
CMD ["python", "-I", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4300"]
