# System Architecture

## Overview

The milk delivery system is designed as a mobile-first SaaS platform with a focus on reliability, auditability, and performance for Kenyan milk distributors.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Admin     │    │  External APIs  │
│   (React)       │    │   (React)       │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     API Gateway           │
                    │   (Express.js Server)     │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼─────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│   PostgreSQL      │   │   SMS Service   │   │  M-Pesa Service │
│   Database        │   │ (Africa's Talk) │   │ (Daraja API)    │
└───────────────────┘   └─────────────────┘   └─────────────────┘
```

## Core Components

### 1. Backend API Server (Node.js + Express)

**Responsibilities:**
- RESTful API endpoints
- Authentication & Authorization (JWT)
- Business logic enforcement
- Transaction management
- Webhook handling
- Rate limiting & security

**Key Modules:**
- `controllers/` - Route handlers
- `services/` - Business logic layer
- `models/` - Database models (Knex.js)
- `middleware/` - Auth, validation, rate limiting
- `integrations/` - External API clients

### 2. Frontend Applications

**Mobile Delivery App:**
- Single-page React application
- Mobile-first responsive design
- Optimized for 3G networks
- Large touch targets for field use
- Offline capability (PWA)

**Admin Dashboard:**
- Full-featured web interface
- Customer management
- Reporting & analytics
- Payment reconciliation
- System configuration

### 3. Database Design (PostgreSQL)

**Key Principles:**
- Immutable delivery records
- Audit trail for all transactions
- Computed balances (no direct edits)
- Foreign key constraints
- Optimized indexes for performance

**Core Tables:**
- `users` - System users (admin, delivery agents)
- `customers` - Customer accounts
- `deliveries` - Immutable delivery records
- `payments` - M-Pesa payment records
- `transactions` - Unified transaction ledger
- `sms_logs` - SMS delivery tracking
- `balance_adjustments` - Admin balance corrections

### 4. External Integrations

**Africa's Talking SMS:**
- Real-time customer notifications
- Delivery confirmations
- Payment reminders
- Retry logic for failed messages

**Safaricom Daraja API:**
- C2B Paybill integration
- Payment webhook processing
- Transaction validation
- Duplicate detection

## Security Architecture

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Session management
- Password hashing (bcrypt)

### Data Protection
- Input validation (Joi schemas)
- SQL injection prevention (Knex.js)
- XSS protection (Helmet.js)
- CORS configuration

### API Security
- Rate limiting (express-rate-limit)
- Request size limits
- Webhook signature verification
- HTTPS enforcement

## Transaction Flow

### Delivery Process (Critical Path)

```
1. Agent selects customer
2. System displays current balance & price
3. Agent enters litres delivered
4. System calculates new balance
5. Agent confirms delivery
6. ATOMIC TRANSACTION:
   - Create delivery record
   - Update customer balance
   - Create transaction entry
   - Trigger SMS
   - Generate receipt
7. Customer receives SMS confirmation
8. Optional: Customer acknowledgment (PIN/signature)
```

### Payment Process (M-Pesa Integration)

```
1. Customer pays via M-Pesa Paybill
2. Safaricom sends webhook callback
3. System validates webhook signature
4. Match payment to customer (account number)
5. ATOMIC TRANSACTION:
   - Create payment record
   - Update customer balance
   - Create transaction entry
   - Send confirmation SMS
6. Handle unmatched payments (admin review)
```

## Performance Considerations

### Database Optimization
- Strategic indexing on frequently queried fields
- Partitioning for large transaction tables
- Connection pooling (PgBouncer recommended)
- Read replicas for reporting queries

### API Performance
- Response caching for static data
- Database query optimization
- Compression for mobile clients
- CDN for static assets

### Mobile Optimization
- Minimal JavaScript bundles
- Progressive image loading
- Service worker for offline support
- Optimized for 3G networks

## Deployment Architecture

### Production Environment (Ubuntu Server)

```
┌─────────────────┐
│   Nginx         │ (Reverse Proxy, SSL termination)
└─────────┬───────┘
          │
┌─────────▼─────────┐
│   Node.js App     │ (PM2 process manager)
└─────────┬─────────┘
          │
┌─────────▼─────────┐
│   PostgreSQL      │ (Database server)
└───────────────────┘
```

### Container Support (Docker)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Container │    │   DB Container  │    │  Nginx Container│
│   (Node.js)     │    │  (PostgreSQL)   │    │   (Reverse)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Docker Network       │
                    └───────────────────────────┘
```

## Monitoring & Logging

### Application Monitoring
- Error tracking (Sentry recommended)
- Performance metrics
- API response times
- Database query performance

### Business Metrics
- Daily delivery volumes
- Payment success rates
- SMS delivery rates
- Customer balance trends

### Security Monitoring
- Failed login attempts
- Unusual payment patterns
- API abuse detection
- Webhook validation failures

## Disaster Recovery

### Database Backups
- Daily automated backups
- Point-in-time recovery
- Cross-region replication
- Backup verification

### Application Redundancy
- Multi-instance deployment
- Load balancing
- Health checks
- Graceful failover

## Compliance & Audit

### Data Integrity
- Immutable delivery records
- Complete audit trail
- Transaction reconciliation
- Regulatory compliance

### Privacy Protection
- Customer data encryption
- Access logging
- Data retention policies
- GDPR considerations
