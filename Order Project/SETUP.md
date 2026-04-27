# Setup Guide

## Quick Start

This guide will help you get the Milk Delivery System running locally for development and testing.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn
- Git

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/milk-delivery-system.git
cd milk-delivery-system

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb milk_delivery_dev

# Copy environment file
cd ../backend
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

Example `.env` configuration:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=milk_delivery_dev
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_here
PORT=3001
NODE_ENV=development
```

### 3. Run Database Migrations

```bash
cd backend
npm run migrate
```

### 4. Start Development Servers

```bash
# From root directory, start both frontend and backend
npm run dev
```

This will start:
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

## API Credentials Setup

### Africa's Talking (SMS)

1. Sign up at [africastalking.com](https://africastalking.com)
2. Get your username and API key
3. Add to backend `.env`:
```bash
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
```

### M-Pesa Daraja API

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create a new app and get credentials
3. Add to backend `.env`:
```bash
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=http://localhost:3001/api/v1/payments/mpesa/callback
```

## Testing the System

### 1. Create Admin User

```bash
# Register first admin user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "phone": "+254712345678",
    "password": "admin123",
    "role": "admin"
  }'
```

### 2. Create Delivery Agent

```bash
# Create delivery agent user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Delivery",
    "phone": "+254723456789",
    "password": "agent123",
    "role": "delivery_agent"
  }'
```

### 3. Create Test Customer

```bash
# Login as admin to get token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+254712345678",
    "password": "admin123"
  }'

# Use token to create customer
curl -X POST http://localhost:3001/api/v1/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Shop",
    "phone": "+254734567890",
    "paybill_account": "123456",
    "price_per_litre": 50.00
  }'
```

### 4. Test Delivery Flow

1. Open http://localhost:3000
2. Login as delivery agent (+254723456789 / agent123)
3. Search for "Test Shop"
4. Enter litres (e.g., 15.5)
5. Confirm delivery
6. Check SMS logs and customer balance

## Development Workflow

### Backend Development

```bash
cd backend
npm run dev  # Starts with nodemon for auto-restart
```

### Frontend Development

```bash
cd frontend
npm start  # Starts React dev server
```

### Database Changes

```bash
cd backend

# Create new migration
npm run migrate:make create_new_table

# Run migrations
npm run migrate

# Rollback migration
npm run rollback

# Seed test data
npm run seed
```

## API Testing

### Using Postman/Curl

All API endpoints are documented in `API_SPECIFICATION.md`. Here are some key endpoints:

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+254712345678", "password": "admin123"}'

# Get customers (requires auth token)
curl -X GET http://localhost:3001/api/v1/customers \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create delivery
curl -X POST http://localhost:3001/api/v1/deliveries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customer_id": "customer-uuid",
    "litres": 10.5
  }'
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify database exists: `psql -l`
   - Check credentials in `.env`

2. **Port Already in Use**
   - Kill process: `lsof -ti:3001 | xargs kill`
   - Change port in `.env`

3. **SMS Not Sending**
   - Verify Africa's Talking credentials
   - Check API credits balance
   - Review API logs

4. **M-Pesa Callbacks Not Working**
   - Use ngrok for local testing: `ngrok http 3001`
   - Update callback URL in M-Pesa dashboard
   - Check webhook endpoint is accessible

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

### Database Reset

```bash
# Drop and recreate database
dropdb milk_delivery_dev
createdb milk_delivery_dev
npm run migrate
npm run seed
```

## Production Considerations

When moving to production:

1. **Environment Variables**
   - Use production database
   - Set strong JWT secret
   - Configure production API URLs

2. **Security**
   - Enable HTTPS
   - Set up firewall rules
   - Configure rate limiting

3. **Performance**
   - Enable database connection pooling
   - Set up Redis for caching
   - Configure CDN for static assets

4. **Monitoring**
   - Set up application monitoring
   - Configure error tracking
   - Monitor database performance

## Contributing

### Code Style

- Use ESLint configuration
- Follow existing patterns
- Write tests for new features
- Update documentation

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push and create PR
git push origin feature/new-feature
```

## Support

For setup issues:
1. Check this guide first
2. Review error logs
3. Check GitHub issues
4. Contact development team

## Next Steps

After setup is complete:

1. Configure API credentials
2. Create test users and customers
3. Test delivery workflow
4. Set up M-Pesa callbacks
5. Test SMS notifications
6. Review admin dashboard features
