# API Specification

## Base URL
`https://api.milkdelivery.co.ke/api/v1`

## Authentication

All API endpoints (except login) require JWT authentication:

```
Authorization: Bearer <jwt_token>
```

## Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {}
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Endpoints

### Authentication

#### POST /auth/login
Login user and return JWT token.

**Request:**
```json
{
  "phone": "+254712345678",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+254712345678",
      "role": "delivery_agent"
    }
  }
}
```

#### POST /auth/refresh
Refresh JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Customers

#### GET /customers
Get all customers (admin only).

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by name or phone
- `status` (string): Filter by status (active/inactive)

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "name": "Jane Shop",
        "phone": "+254723456789",
        "paybill_account": "123456",
        "price_per_litre": 50.00,
        "outstanding_balance": 1500.00,
        "is_active": true,
        "last_delivery_at": "2024-01-01T10:30:00Z",
        "last_payment_at": "2024-01-01T09:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### POST /customers
Create new customer (admin only).

**Request:**
```json
{
  "name": "New Shop",
  "phone": "+254734567890",
  "paybill_account": "123457",
  "price_per_litre": 52.00,
  "notes": "Regular customer"
}
```

#### GET /customers/:id
Get customer details.

#### PUT /customers/:id
Update customer (admin only).

#### DELETE /customers/:id
Deactivate customer (admin only).

#### GET /customers/search
Search customers for delivery (delivery agent).

**Query Parameters:**
- `q` (string): Search query (name or phone)

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "name": "Jane Shop",
        "phone": "+254723456789",
        "paybill_account": "123456",
        "price_per_litre": 50.00,
        "outstanding_balance": 1500.00
      }
    ]
  }
}
```

### Deliveries

#### POST /deliveries
Create new delivery (atomic transaction).

**Request:**
```json
{
  "customer_id": "uuid",
  "litres": 15.5,
  "customer_confirmation": {
    "method": "pin",
    "data": "1234"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "delivery": {
      "id": "uuid",
      "delivery_id": "DLV20240101001",
      "customer_id": "uuid",
      "litres": 15.5,
      "price_per_litre": 50.00,
      "total_amount": 775.00,
      "previous_balance": 1500.00,
      "new_balance": 2275.00,
      "delivery_timestamp": "2024-01-01T12:00:00Z",
      "status": "confirmed"
    },
    "customer": {
      "outstanding_balance": 2275.00
    },
    "receipt_url": "https://api.milkdelivery.co.ke/receipts/DLV20240101001"
  }
}
```

#### GET /deliveries
Get deliveries (filtered by user role).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `customer_id` (string): Filter by customer
- `date_from` (string): ISO date
- `date_to` (string): ISO date
- `status` (string): Filter by status

#### GET /deliveries/:id
Get delivery details.

#### GET /deliveries/:id/receipt
Get printable receipt (HTML format).

### Payments

#### POST /payments/mpesa/callback
M-Pesa C2B webhook endpoint (no authentication required).

**Request:**
```json
{
  "TransactionType": "PayBill",
  "TransID": "QJ12A34B5",
  "TransTime": "20240101120000",
  "TransAmount": "1000.00",
  "BusinessShortCode": "123456",
  "BillRefNumber": "123456",
  "InvoiceNumber": "",
  "OrgAccountBalance": "",
  "ThirdPartyTransID": "",
  "PhoneNumber": "+254712345678",
  "FirstName": "John",
  "MiddleName": "",
  "LastName": "Doe"
}
```

#### GET /payments
Get payments (admin only).

#### GET /payments/unmatched
Get unmatched payments for manual reconciliation (admin only).

#### POST /payments/:payment_id/match
Manually match payment to customer (admin only).

### Transactions

#### GET /transactions/customer/:customer_id
Get customer transaction history.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `type` (string): Filter by type (delivery/payment/adjustment)
- `date_from` (string): ISO date
- `date_to` (string): ISO date

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "transaction_type": "delivery",
        "amount": 775.00,
        "balance_before": 1500.00,
        "balance_after": 2275.00,
        "description": "Delivery of 15.5L @ Ksh 50.00/L",
        "transaction_timestamp": "2024-01-01T12:00:00Z",
        "delivery_id": "uuid"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25
    }
  }
}
```

### Balance Adjustments

#### POST /adjustments
Create balance adjustment (admin only).

**Request:**
```json
{
  "customer_id": "uuid",
  "adjustment_amount": -100.00,
  "reason": "Bad milk - customer refund"
}
```

#### GET /adjustments
Get balance adjustments (admin only).

### Dashboard

#### GET /dashboard/metrics
Get dashboard metrics (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "total_deliveries": 25,
      "total_litres": 375.5,
      "total_value": 18775.00,
      "total_payments": 12500.00,
      "new_customers": 2
    },
    "this_week": {
      "total_deliveries": 150,
      "total_litres": 2250.0,
      "total_value": 112500.00,
      "total_payments": 87500.00
    },
    "outstanding_total": 45000.00,
    "active_customers": 45,
    "unmatched_payments": 3
  }
}
```

#### GET /dashboard/recent-activity
Get recent activity (admin only).

#### GET /dashboard/top-customers
Get top customers by volume/value (admin only).

### SMS

#### POST /sms/send
Send manual SMS (admin only).

**Request:**
```json
{
  "customer_id": "uuid",
  "message": "Custom message content"
}
```

#### GET /sms/logs
Get SMS delivery logs (admin only).

### Users (Admin Only)

#### GET /users
Get all users.

#### POST /users
Create new user.

#### PUT /users/:id
Update user.

#### DELETE /users/:id
Deactivate user.

## Data Validation Rules

### Phone Numbers
- Must be in format: +254XXXXXXXXX
- Must be valid Kenyan numbers

### Paybill Account Numbers
- Must be numeric
- Maximum 10 digits
- Unique per customer

### Delivery Litres
- Must be positive number
- Maximum 2 decimal places
- Maximum 1000 litres per delivery

### Price per Litre
- Must be positive number
- Maximum 2 decimal places
- Range: 1.00 - 1000.00

## Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Authentication: 5 requests per 15 minutes per IP
- M-Pesa webhook: No rate limiting
- SMS sending: 10 requests per minute per user

## Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Invalid input data |
| AUTHENTICATION_ERROR | Invalid or missing token |
| AUTHORIZATION_ERROR | Insufficient permissions |
| NOT_FOUND | Resource not found |
| DUPLICATE_RESOURCE | Resource already exists |
| BUSINESS_RULE_ERROR | Business logic violation |
| EXTERNAL_API_ERROR | Third-party API failure |
| DATABASE_ERROR | Database operation failed |
| RATE_LIMIT_ERROR | Too many requests |

## Webhook Security

M-Pesa webhooks are validated using:
- Timestamp validation (within 5 minutes)
- Signature verification using Safaricom public key
- IP whitelisting (Safaricom IP ranges)
