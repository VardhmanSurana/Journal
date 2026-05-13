FROM python:3.12-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies first for better caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# Copy the rest of the application
COPY . .

# Install the project
RUN uv sync --frozen

# Create a directory for the SQLite database
RUN mkdir -p /app/data

# Expose the port FastAPI runs on
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_URL=sqlite:////app/data/journal.db

# Run the application
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
