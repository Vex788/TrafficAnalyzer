# TrafficAnalyzer - Web Platform Redesign

## Overview
Complete redesign from Windows Forms desktop app to scalable multi-user web platform with admin analytics, LLM integration, and comprehensive tracking.

## Architecture

### Technology Stack
- **Backend**: Node.js + Express.js + Socket.io
- **Frontend**: React.js + Redux (state management)
- **Database**: PostgreSQL + Redis (caching)
- **LLM**: OpenAI/Claude API for price scraping & analytics
- **Deployment**: Docker + Docker Compose
- **Monitoring**: Winston (logging), Prometheus (metrics)
- **Security**: JWT, bcrypt, helmet, rate-limiting

### Project Structure
```
TrafficAnalyzer-Web/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── models/         # Database models
│   │   ├── routes/         # API endpoints
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   ├── services/       # External services (LLM, scraping)
│   │   ├── utils/          # Utilities
│   │   └── index.js        # Entry point
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Redux store
│   │   ├── utils/          # Utilities
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── INSTALLATION.md
└── README.md
```

## Features

### User Features
- Listing/item tracking with automated price scraping
- Real-time price alerts
- Click history and user action tracking
- Personal dashboard with statistics
- Wishlist management
- Multi-device support

### Admin Features
- User management and analytics
- User action maps (heatmaps of clicks/interactions)
- System settings configuration
- SSL certificate management
- LLM-powered recommendations
- Traffic analytics and metrics
- Custom reports generation
- Audit logs

### Performance Optimizations
- Redis caching for frequently accessed data
- Database query optimization with indexes
- CDN-ready static asset handling
- Lazy loading and code splitting
- Background job processing with Bull queues
- Compression and minification

### Security Features
- JWT-based authentication
- Rate limiting on API endpoints
- CSRF protection
- Input validation and sanitization
- Password hashing with bcrypt
- SSL/TLS support
- Helmet.js for secure headers
- XSS protection
- SQL injection prevention with parameterized queries
- Audit logging for admin actions

## Installation

See `INSTALLATION.md` for complete setup instructions.

## Configuration

See `CONFIGURATION.md` for SSL and environment setup.

## Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Run development servers
docker-compose -f docker-compose.dev.yml up

# Run tests
npm test

# Build for production
npm run build
```
