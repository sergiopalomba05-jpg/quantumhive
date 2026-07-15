FROM python:3.11-slim

# Definir el directorio de trabajo
WORKDIR /app

# Instalar Node.js para compilar el frontend (opcional si lo subes ya compilado, pero útil para CI/CD)
# Aunque en este caso, como ya tienes la carpeta 'frontend/dist' generada localmente, 
# solo necesitamos subir el código y servirlo.

# Copiar el requirements de backend e instalar dependencias
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copiar todo el código de backend y frontend (asegúrate de que frontend/dist esté generado)
COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/

# Exponer el puerto que usará Cloud Run (8080)
EXPOSE 8080

# Comando para ejecutar la aplicación
# Cambiamos el puerto por defecto de uvicorn al puerto definido por Google Cloud Run ($PORT o 8080)
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
