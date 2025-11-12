# TrafficAnalyzer - Installation & Deployment Guide

A comprehensive guide to install and deploy the TrafficAnalyzer web platform for thousands of concurrent users.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start with Docker](#quick-start-with-docker)
3. [Production Deployment](#production-deployment)
4. [SSL/TLS Configuration](#ssltls-configuration)
5. [Database Setup](#database-setup)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- **CPU**: 4+ cores recommended
- **RAM**: 8GB+ minimum (16GB+ for production)
- **Storage**: 100GB+ SSD
- **Network**: 100Mbps+ internet connection

### Software Requirements

- **Docker**: 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- **Git**: 2.30+
- **OpenAI API Key** (for LLM features): [Get API key](https://platform.openai.com/api-keys)
- **SSL Certificate** (optional but recommended): Self-signed or valid certificate

---

## Quick Start with Docker

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/trafficanalyzer.git
cd TrafficAnalyzer
```

### 2. Create Environment File

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and configure:

```env
NODE_ENV=production
PORT=3000
DB_PASSWORD=your_secure_db_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=your_super_secret_jwt_key_change_this
OPENAI_API_KEY=sk-your-openai-api-key
FRONTEND_URL=https://your-domain.com
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed initial data (optional)
docker-compose exec backend npm run seed
```

### 5. Access the Application

- **Frontend**: http://localhost:3001
- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

---

## Production Deployment

### 1. Server Setup (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl git wget

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # API (optional, use only if not behind nginx)
```

### 3. Create Application Directory

```bash
sudo mkdir -p /opt/trafficanalyzer
sudo chown $USER:$USER /opt/trafficanalyzer

cd /opt/trafficanalyzer
git clone https://github.com/your-org/trafficanalyzer.git .
```

### 4. Setup Environment

```bash
# Copy and edit environment files
cp backend/.env.example backend/.env

# Generate secure keys
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)
REDIS_PASSWORD=$(openssl rand -base64 24)

# Update .env with secrets
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" backend/.env
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" backend/.env
```

### 5. Create Systemd Service

Create `/etc/systemd/system/trafficanalyzer.service`:

```ini
[Unit]
Description=TrafficAnalyzer Platform
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/trafficanalyzer
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable trafficanalyzer
sudo systemctl start trafficanalyzer

# Check status
sudo systemctl status trafficanalyzer
```

### 6. Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/trafficanalyzer`:

```nginx
upstream backend {
    server localhost:3000;
}

upstream frontend {
    server localhost:3001;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration (see SSL section below)
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;

    # API Routes
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket Support
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable nginx:

```bash
sudo ln -s /etc/nginx/sites-available/trafficanalyzer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Free, Automatic)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renewal (runs automatically)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify auto-renewal
sudo certbot renew --dry-run
```

Update your environment:

```bash
# In /opt/trafficanalyzer/backend/.env
SSL_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
```

### Option 2: Self-Signed Certificate

```bash
# Generate private key
openssl genrsa -out /etc/ssl/private/server.key 2048

# Generate certificate
openssl req -new -x509 -key /etc/ssl/private/server.key \
  -out /etc/ssl/certs/server.crt \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Org/CN=your-domain.com"

# Secure permissions
sudo chmod 600 /etc/ssl/private/server.key
sudo chmod 644 /etc/ssl/certs/server.crt
```

### Option 3: Commercial Certificate

1. Obtain certificate from your provider (DigiCert, GlobalSign, etc.)
2. Place files in:
   - `/etc/ssl/certs/server.crt` (certificate)
   - `/etc/ssl/private/server.key` (private key)
3. Update `.env` file paths

### Configure via Admin Panel

Once running, admins can upload certificates:

1. Login as admin
2. Navigate to **Settings → SSL Configuration**
3. Upload certificate and key files
4. Click **Apply & Restart**

---

## Database Setup

### Backup Strategy

```bash
# Daily backup script
cat > /opt/trafficanalyzer/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/trafficanalyzer/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump \
  -U trafficanalyzer trafficanalyzer | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only 30 days of backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
EOF

chmod +x /opt/trafficanalyzer/backup.sh

# Schedule daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/trafficanalyzer/backup.sh") | crontab -
```

### Restore from Backup

```bash
# Restore database
zcat /opt/trafficanalyzer/backups/db_20240101_020000.sql.gz | \
docker-compose exec -T postgres psql -U trafficanalyzer trafficanalyzer
```

---

## Performance Optimization

### 1. Database Connection Pooling

Already configured in `backend/.env`:

```env
DB_POOL_MIN=2
DB_POOL_MAX=10
```

Adjust based on concurrent users.

### 2. Redis Caching

```bash
# Monitor Redis
docker-compose exec redis redis-cli info stats

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHALL
```

### 3. CDN Setup (CloudFlare Example)

1. Point DNS to CloudFlare
2. Enable caching for static assets
3. Configure rate limiting
4. Enable DDoS protection

### 4. Database Indexing

Already applied to key tables. For custom queries:

```sql
CREATE INDEX idx_user_actions_user_date
ON "UserActions"("userId", "createdAt");

CREATE INDEX idx_listings_user_status
ON "Listings"("userId", "status");
```

### 5. Scale Horizontally

```bash
# For load balancing multiple backends
docker-compose scale backend=3

# Use HAProxy or AWS Load Balancer for distribution
```

---

## Monitoring & Logging

### Container Logs

```bash
# View real-time logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Export logs
docker-compose logs backend > backend.log

# Limited log retention in docker-compose.yml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

### Health Checks

```bash
# API health
curl http://localhost:3000/api/health

# Database health
docker-compose exec postgres pg_isready -U trafficanalyzer

# Redis health
docker-compose exec redis redis-cli ping
```

### Monitoring Stack (Optional)

```bash
# Install Prometheus and Grafana for advanced monitoring
# See: https://prometheus.io/docs/prometheus/latest/getting_started/
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Verify ports are available
sudo netstat -tulpn | grep -E '3000|3001|5432|6379'

# Reset everything
docker-compose down -v
docker-compose up -d
```

### Database Connection Issues

```bash
# Test connection
docker-compose exec postgres psql -U trafficanalyzer -d trafficanalyzer -c "SELECT 1;"

# Check environment variables
docker-compose exec backend env | grep DB_
```

### Memory Issues

```bash
# Check container resource usage
docker stats

# Increase Docker memory
# Edit /etc/docker/daemon.json and restart docker
```

### SSL Certificate Errors

```bash
# Verify certificate
openssl x509 -in /etc/ssl/certs/server.crt -text -noout

# Check certificate expiration
openssl x509 -enddate -noout -in /etc/ssl/certs/server.crt
```

### High CPU Usage

```bash
# Profile backend
docker-compose exec backend node --prof src/index.js

# Analyze
docker-compose exec backend node --prof-process isolate-*.log > profile.txt
```

---

## Additional Resources

- **Documentation**: See `README.md` and `CONFIGURATION.md`
- **API Docs**: http://localhost:3000/api/docs
- **Admin Panel**: http://localhost:3001/admin
- **Support**: Create an issue on GitHub

---

## Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable rate limiting on API
- [ ] Configure CORS properly
- [ ] Use strong JWT secret
- [ ] Enable admin action logging
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

---

## Support & Maintenance

For support, visit: [GitHub Issues](https://github.com/your-org/trafficanalyzer/issues)

Last Updated: 2024
