# Deployment Guide

## Overview

This guide covers deploying the Milk Delivery System to production using Docker on Ubuntu servers.

## Prerequisites

- Ubuntu 20.04+ server
- Docker and Docker Compose installed
- SSL certificates (for HTTPS)
- Domain name configured
- External API credentials (Africa's Talking, M-Pesa Daraja)

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-org/milk-delivery-system.git
cd milk-delivery-system
```

### 2. Configure Environment
```bash
cd deployment
cp .env.example .env
```

Edit `.env` with your actual values:
- Database password
- JWT secret
- API credentials
- Business details
- SSL paths

### 3. Deploy with Docker Compose
```bash
docker-compose up -d
```

### 4. Setup Database
```bash
# Run database migrations
docker-compose exec backend npm run migrate

# Seed initial data (optional)
docker-compose exec backend npm run seed
```

### 5. Verify Deployment
- Frontend: https://yourdomain.com
- API: https://yourdomain.com/api/v1/health
- Admin: https://yourdomain.com/dashboard

## Manual Deployment (Without Docker)

### Backend Setup

1. **Install Node.js 18+**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install PostgreSQL**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

3. **Setup Database**
```bash
sudo -u postgres psql
CREATE DATABASE milk_delivery;
CREATE USER milk_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE milk_delivery TO milk_user;
\q
```

4. **Deploy Backend**
```bash
cd backend
npm install --production
npm run migrate
npm run seed
npm install -g pm2
pm2 start src/index.js --name "milk-delivery-api"
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Build for Production**
```bash
npm run build
```

3. **Setup Nginx**
```bash
sudo apt install nginx
sudo cp deployment/nginx.conf /etc/nginx/sites-available/milk-delivery
sudo ln -s /etc/nginx/sites-available/milk-delivery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Configuration

### Using Let's Encrypt (Recommended)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Manual SSL
Place certificates in `/etc/nginx/ssl/`:
- `cert.pem` (full chain)
- `key.pem` (private key)

## Environment Variables

### Backend (.env)
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=milk_delivery
DB_USER=milk_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_32_character_secret
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production

# APIs
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://yourdomain.com/api/v1/payments/mpesa/callback

# Business
BUSINESS_NAME=Your Milk Business
BUSINESS_PHONE=+254712345678
BUSINESS_PAYBILL=123456
```

### Frontend
```bash
REACT_APP_API_URL=https://yourdomain.com/api/v1
```

## Database Management

### Migrations
```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run rollback

# Create new migration
knex migrate:make migration_name
```

### Backups
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/milk-delivery"
mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U postgres milk_delivery > $BACKUP_DIR/backup_$DATE.sql

# Keep last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

## Monitoring

### Health Checks
- API Health: `GET /health`
- Database: Verify connection pool
- External APIs: Monitor response times

### Logs
```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# PM2 logs (manual deployment)
pm2 logs milk-delivery-api
```

### Performance Monitoring
Consider setting up:
- Application monitoring (Sentry, DataDog)
- Server monitoring (Uptime Robot)
- Database monitoring (pgBouncer, connection pooling)

## Security

### Firewall Configuration
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Security Headers
The nginx configuration includes:
- HSTS
- XSS Protection
- Content Type Options
- Frame Options

### Rate Limiting
- API endpoints: 100 requests/15min
- Login endpoint: 5 requests/15min
- M-Pesa webhook: No rate limiting

## Scaling

### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
  frontend:
    deploy:
      replicas: 2
```

### Database Scaling
- Read replicas for reporting queries
- Connection pooling (PgBouncer)
- Index optimization

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify credentials in .env
   - Check network connectivity

2. **SMS Not Sending**
   - Verify Africa's Talking credentials
   - Check API credits
   - Review SMS logs

3. **M-Pesa Callbacks Not Working**
   - Verify webhook URL is accessible
   - Check SSL certificate validity
   - Review M-Pesa configuration

4. **Frontend Not Loading**
   - Check API URL configuration
   - Verify CORS settings
   - Review browser console for errors

### Debug Mode
```bash
# Enable debug logging
DEBUG=* docker-compose up
```

## Maintenance

### Updates
```bash
# Pull latest changes
git pull origin main

# Update and restart services
docker-compose down
docker-compose pull
docker-compose up -d

# Run migrations if needed
docker-compose exec backend npm run migrate
```

### Backup Strategy
1. Daily automated database backups
2. Weekly full system backups
3. Off-site backup storage
4. Regular restore testing

## Support

For deployment issues:
1. Check logs for error messages
2. Verify environment variables
3. Test API endpoints individually
4. Review documentation
5. Contact support with logs

## Performance Optimization

### Database
- Regular VACUUM and ANALYZE
- Monitor slow queries
- Optimize indexes
- Connection pooling

### Application
- Enable gzip compression
- Implement caching (Redis)
- Optimize bundle sizes
- Use CDN for static assets

### Server
- Monitor resource usage
- Optimize nginx configuration
- Enable HTTP/2
- Configure proper caching
