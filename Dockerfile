FROM python:3.11-slim

# Install Node.js 20.x repository
RUN apt-get update && apt-get install -y curl gnupg ca-certificates \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

# Install system dependencies for OpenConnect VPN, LDAP, Node.js, and Puppeteer
RUN apt-get update && apt-get install -y \
    openconnect \
    vpnc-scripts \
    iproute2 \
    iputils-ping \
    net-tools \
    curl \
    vim \
    nano \
    libldap2-dev \
    libsasl2-dev \
    gcc \
    procps \
    nodejs \
    chromium \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Enable legacy OpenSSL algorithms (required for NTLM/MD4)
RUN sed -i 's/^openssl_conf = openssl_init$/openssl_conf = openssl_init\n\n[openssl_init]\nproviders = provider_sect\n\n[provider_sect]\ndefault = default_sect\nlegacy = legacy_sect\n\n[default_sect]\nactivate = 1\n\n[legacy_sect]\nactivate = 1/' /etc/ssl/openssl.cnf || \
    echo -e "\n[openssl_init]\nproviders = provider_sect\n\n[provider_sect]\ndefault = default_sect\nlegacy = legacy_sect\n\n[default_sect]\nactivate = 1\n\n[legacy_sect]\nactivate = 1" >> /etc/ssl/openssl.cnf

# Copy minimal requirements and install Python dependencies
COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

# Copy automation scripts
COPY automation/ /app/automation/

# Install Node.js dependencies for Puppeteer automation
WORKDIR /app/automation/pptr
RUN npm install

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Go back to app root
WORKDIR /app

# Copy API server
COPY api_server.py /app/

# Expose API port
EXPOSE 5000

# Run API server by default
CMD ["python", "api_server.py"]
