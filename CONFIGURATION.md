# TrafficAnalyzer - Configuration Guide

Complete configuration guide for SSL, email, LLM integration, and system settings.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [SSL/TLS Configuration](#ssltls-configuration)
3. [Email Configuration](#email-configuration)
4. [LLM Integration](#llm-integration)
5. [Admin Panel Settings](#admin-panel-settings)
6. [Performance Tuning](#performance-tuning)
7. [Security Configuration](#security-configuration)

---

## Environment Variables

### Core Configuration

```env
# Server
NODE_ENV=production                    # development | production
PORT=3000                              # Server port
HOST=0.0.0.0                          # Bind to all interfaces
API_URL=https://api.your-domain.com   # External API URL
FRONTEND_URL=https://your-domain.com  # Frontend URL for CORS
```

### Database

```env
# PostgreSQL
DB_HOST=postgres                       # Database host
DB_PORT=5432                          # Database port
DB_USER=trafficanalyzer               # Database user
DB_PASSWORD=your_secure_password       # Database password (CHANGE ME)
DB_NAME=trafficanalyzer               # Database name
DB_POOL_MIN=2                         # Minimum pool connections
DB_POOL_MAX=10                        # Maximum pool connections (increase for more users)
```

### Redis Cache

```env
# Redis
REDIS_HOST=redis                      # Redis host
REDIS_PORT=6379                       # Redis port
REDIS_PASSWORD=your_redis_password    # Redis password (CHANGE ME)
REDIS_DB=0                            # Redis database (0-15)
```

### Authentication

```env
# JWT
JWT_SECRET=your_super_secret_key      # Change this! Use: openssl rand -base64 32
JWT_EXPIRATION=24h                    # Token expiration time
JWT_REFRESH_EXPIRATION=7d             # Refresh token expiration

# Session
SESSION_SECRET=your_session_secret    # Use: openssl rand -base64 32
SESSION_TIMEOUT=3600000               # Session timeout in milliseconds

# Bcrypt
BCRYPT_ROUNDS=10                      # Password hashing rounds (10-12 recommended)
```

### LLM Integration

```env
# LLM Provider
LLM_PROVIDER=openai                   # openai | anthropic
OPENAI_API_KEY=sk-your-api-key       # OpenAI API key (get from https://platform.openai.com)
OPENAI_MODEL=gpt-4-turbo-preview     # GPT model to use
ANTHROPIC_API_KEY=sk-ant-your-key    # Anthropic API key (alternative)
```

### Email Configuration

```env
# SMTP
SMTP_HOST=smtp.gmail.com              # SMTP server
SMTP_PORT=587                         # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=your-email@gmail.com        # Email account
SMTP_PASSWORD=your-app-password       # App-specific password (NOT regular password)
EMAIL_FROM=noreply@trafficanalyzer.com # From email address
```

### SSL/TLS

```env
# SSL Configuration
SSL_ENABLED=true                      # Enable HTTPS
SSL_CERT_PATH=/etc/ssl/certs/server.crt
SSL_KEY_PATH=/etc/ssl/private/server.key
SSL_CA_PATH=/etc/ssl/certs/ca.crt    # Optional CA bundle
```

### Price Scraping

```env
# Scraper
SCRAPER_TIMEOUT=30000                 # Scraper timeout (milliseconds)
SCRAPER_CONCURRENCY=5                 # Number of concurrent scrapes
SCRAPER_USER_AGENT=Mozilla/5.0...     # Browser user agent

# Pricing
ENABLE_PRICE_SCRAPING=true            # Enable/disable price scraping
```

### Admin

```env
# Admin Account
ADMIN_EMAIL=admin@trafficanalyzer.com # Initial admin email
ADMIN_PASSWORD=changeme               # Change on first login!
```

### Logging

```env
# Logging
LOG_LEVEL=info                        # debug | info | warn | error
LOG_FILE=/var/log/trafficanalyzer/app.log
```

### Feature Flags

```env
# Features
ENABLE_PRICE_SCRAPING=true            # Enable price tracking
ENABLE_LLM_RECOMMENDATIONS=true       # Enable AI recommendations
ENABLE_USER_TRACKING=true             # Enable activity tracking
ENABLE_ANALYTICS=true                 # Enable analytics dashboard
```

### Rate Limiting

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000           # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100           # Requests per window
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
```

### Data Retention

```env
# Data Retention Policies
DATA_RETENTION_DAYS=90                # Delete user actions after X days
ANALYTICS_RETENTION_DAYS=365          # Delete analytics after X days
```

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Recommended)

#### Automatic Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Update .env
SSL_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem

# Auto-renewal
sudo systemctl enable certbot.timer
```

#### Manual Renewal

```bash
# Renew before expiration
sudo certbot renew --dry-run

# Check renewal status
sudo certbot certificates
```

### Option 2: Self-Signed Certificate (Development)

```bash
# Generate private key
openssl genrsa -out server.key 2048

# Generate certificate (365 days validity)
openssl req -new -x509 -key server.key -out server.crt -days 365 \
  -subj "/C=US/ST=California/L=San Francisco/O=YourOrg/CN=your-domain.com"

# Move to secure location
sudo mkdir -p /etc/ssl/private /etc/ssl/certs
sudo mv server.key /etc/ssl/private/server.key
sudo mv server.crt /etc/ssl/certs/server.crt
sudo chmod 600 /etc/ssl/private/server.key
sudo chmod 644 /etc/ssl/certs/server.crt
```

### Option 3: Commercial Certificate

1. Purchase from provider (DigiCert, GlobalSign, etc.)
2. Place in `/etc/ssl/certs/server.crt` and `/etc/ssl/private/server.key`
3. Update `.env` with paths

### Upload via Admin Panel

1. Login as superadmin
2. Navigate to **Settings → SSL Configuration**
3. Click **Upload Certificate**
4. Paste certificate content (PEM format)
5. Paste private key content
6. Click **Apply**
7. Restart server

### Verify Certificate

```bash
# View certificate details
openssl x509 -in /etc/ssl/certs/server.crt -text -noout

# Check expiration
openssl x509 -enddate -noout -in /etc/ssl/certs/server.crt

# Test SSL connection
openssl s_client -connect your-domain.com:443
```

---

## Email Configuration

### Gmail Setup

1. Enable 2-Factor Authentication
2. Generate App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Copy the generated password

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # 16-character app password
EMAIL_FROM=noreply@your-domain.com
```

### Office 365 Setup

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourcompany.com
SMTP_PASSWORD=your_password
EMAIL_FROM=your-email@yourcompany.com
```

### SendGrid Setup

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key
EMAIL_FROM=noreply@your-domain.com
```

### Custom SMTP Server

```env
SMTP_HOST=your-mail-server.com
SMTP_PORT=587                 # or 465 for SSL
SMTP_USER=your-username
SMTP_PASSWORD=your-password
EMAIL_FROM=admin@your-domain.com
```

---

## LLM Integration

### OpenAI Setup

1. Create account at https://platform.openai.com
2. Generate API key: https://platform.openai.com/api-keys
3. Add billing information

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview    # or gpt-3.5-turbo for lower cost
```

### Model Options

| Model | Cost | Speed | Quality |
|-------|------|-------|---------|
| gpt-3.5-turbo | $0.50/1M tokens | Fastest | Good |
| gpt-4-turbo-preview | $10/1M tokens | Medium | Best |
| gpt-4 | $30/1M tokens | Slowest | Best |

### Cost Estimation

```
Average requests per month: 10,000
- Price extraction: ~100 tokens
- Recommendations: ~500 tokens
- Analytics: ~300 tokens

Monthly cost (GPT-3.5): ~$3
Monthly cost (GPT-4): ~$40
```

### Anthropic Setup (Alternative)

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

---

## Admin Panel Settings

Access admin settings at `https://your-domain.com/admin/settings`

### General Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Site Name | TrafficAnalyzer | Platform name |
| Site URL | | Public URL |
| Support Email | admin@example.com | Support contact |
| Maintenance Mode | Off | Pause user operations |

### Email Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Email | true | Send emails |
| Email Provider | SMTP | Provider type |
| From Address | noreply@example.com | Sender email |
| Test Email | | Send test email |

### LLM Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Provider | openai | LLM provider |
| API Key | | Configured via ENV |
| Model | gpt-4-turbo | Model selection |
| Temperature | 0.7 | Response creativity |
| Max Tokens | 1000 | Response length |

### Security Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Password Min Length | 8 | Minimum password length |
| Session Timeout | 24h | User session duration |
| 2FA Required | false | Two-factor authentication |
| Rate Limit | 100/15min | API rate limit |

### Scraper Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Scraping | true | Enable price tracking |
| Scrape Interval | 6h | How often to scrape |
| Timeout | 30s | Scraper timeout |
| Concurrent | 5 | Parallel scrapes |

### Analytics Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Tracking Enabled | true | Track user actions |
| Heatmap Enabled | true | Record click coordinates |
| Retention Days | 90 | Data retention period |
| Sample Rate | 100% | Percentage of sessions |

---

## Performance Tuning

### Database Optimization

```env
# Connection pooling
DB_POOL_MIN=2      # Minimum connections
DB_POOL_MAX=20     # Maximum connections (for 1000+ users)

# Query timeout
QUERY_TIMEOUT=10000  # Milliseconds

# Batch operations
BATCH_SIZE=1000      # Rows per batch
```

### Redis Configuration

```env
# Caching strategy
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Memory management
REDIS_MAX_MEMORY=256mb    # Adjust based on available RAM
REDIS_EVICTION_POLICY=allkeys-lru
```

### Node.js Optimization

```bash
# Set Node.js environment
export NODE_ENV=production

# Enable clustering (in app startup)
export NODE_CLUSTER=true

# Memory limits
export NODE_MAX_OLD_SPACE_SIZE=4096  # 4GB
```

---

## Security Configuration

### Helmet.js Headers (Auto-configured)

```
Strict-Transport-Security: max-age=31536000
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

### CORS Settings

```env
FRONTEND_URL=https://your-domain.com  # Only allow your domain
```

### Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000           # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100           # 100 requests
```

Endpoints with stricter limits:
- `/api/auth/login`: 5 attempts / 15 min
- `/api/auth/register`: 3 attempts / hour
- `/api/listings/*/scrape`: 1 / 5 min

### Input Validation

All API inputs are validated:

```javascript
// Example validation rules
{
  email: ['required', 'email', 'maxLength:255'],
  password: ['required', 'minLength:8', 'maxLength:128'],
  url: ['required', 'url', 'maxLength:2048']
}
```

### Password Requirements

```
Minimum Length: 8 characters
Recommended: Mix of upper, lower, numbers, special characters
Never: Dictionary words, sequential numbers, repeated chars
```

---

## Monitoring Configuration

### Logging Levels

```env
LOG_LEVEL=info    # development: debug, production: info

Levels (in order of severity):
- error: System errors
- warn: Warnings (rate limits, failed actions)
- info: General information (logins, api calls)
- debug: Detailed debugging info
```

### Log Retention

```env
LOG_FILE=/var/log/trafficanalyzer/app.log
# Max 10MB per file, keep last 5 files
# = ~50MB storage
```

### Health Check Endpoints

```bash
# API Health
GET /api/health
Response: { status: "ok", uptime: 123456 }

# Database Health
GET /api/admin/health/db
Response: { status: "connected", latency: "45ms" }

# Cache Health
GET /api/admin/health/cache
Response: { status: "connected", latency: "12ms" }
```

---

## Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# /opt/trafficanalyzer/backup.sh

BACKUP_DIR="/backups/trafficanalyzer"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T postgres pg_dump \
  -U trafficanalyzer trafficanalyzer | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Config backup
cp backend/.env $BACKUP_DIR/.env_$DATE

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

Schedule with cron:

```bash
# Daily 2 AM backup
0 2 * * * /opt/trafficanalyzer/backup.sh
```

---

## Troubleshooting

### Common Issues

**Issue**: 502 Bad Gateway
```
Solution: Check backend health
docker-compose logs backend
```

**Issue**: SSL Certificate Error
```
Solution: Verify certificate paths and permissions
ls -la /etc/ssl/certs/
openssl x509 -in /etc/ssl/certs/server.crt -text -noout
```

**Issue**: Database Connection Timeout
```
Solution: Check pool settings and connections
SELECT * FROM pg_stat_activity;
```

**Issue**: High Memory Usage
```
Solution: Check Redis and increase limits
docker stats
NODE_MAX_OLD_SPACE_SIZE=8192
```

---

Last Updated: 2024
