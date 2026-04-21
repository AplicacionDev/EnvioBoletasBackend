# ── Build stage ──
FROM node:22-slim AS build

# Install build tools for native modules (msnodesqlv8)
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    make \
    python3 \
    unixodbc-dev \
    curl \
    gnupg2 \
    ca-certificates \
  && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
  && apt-get update \
  && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies (with native builds for msnodesqlv8)
RUN pnpm install --prod --frozen-lockfile

# Manually trigger puppeteer install (downloads Chromium)
RUN npx puppeteer browsers install chrome

# ── Production stage ──
FROM node:22-slim

# Install ca-certificates first, then Microsoft ODBC Driver + Puppeteer/Chromium deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg2 \
  && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
  && apt-get update \
  && ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
    msodbcsql18 \
    unixodbc \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -G audio,video appuser \
    && mkdir -p /home/appuser && chown -R appuser:appuser /home/appuser

WORKDIR /app

# Copy built node_modules and Chromium cache from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /root/.cache/puppeteer /home/appuser/.cache/puppeteer

# Copy application code
COPY package.json ./
COPY src ./src
COPY config ./config
COPY templates ./templates
COPY public ./public
COPY boleta.html ./

# Set ownership
RUN chown -R appuser:appuser /app /home/appuser/.cache

USER appuser

ENV NODE_ENV=production
EXPOSE 3500

CMD ["node", "src/index.js"]
