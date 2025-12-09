# E-Commerce Cart & Coupon Service

A comprehensive Cart and Coupon Service built with **TypeScript** **NestJS**, **PostgreSQL**, **TypeORM**, and **Redis**. This service allows customers to manage their shopping cart, apply coupons (both manual and auto-applied), and calculate total amounts after discounts with proper concurrency handling.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Getting Started](#-getting-started)
- [Docker](#-docker)
- [Environment Variables](#-environment-variables)

## ✨ Features

### Cart Management
- ✅ Add items to cart with stock validation
- ✅ Update item quantities with stock checking
- ✅ Remove items from cart
- ✅ Clear entire cart
- ✅ Display cart with calculated totals:
  - Total price before discount
  - Applied discount amount
  - Final payable amount

### Coupon System

#### General Coupons (Manual Entry)
- Customer manually enters coupon code
- Validates all coupon rules before application
- Prevents invalid coupon usage

#### Auto-Applied Coupons
- Automatically applied when cart meets conditions
- Selects the best coupon (highest discount)
- Re-evaluated on every cart modification
- Lower priority than manually applied coupons

### Discount Types
- **Fixed Amount**: e.g., $100 off
- **Percentage**: e.g., 10% off with optional maximum cap

### Coupon Rules/Attributes
- ✅ Start time and expiry time
- ✅ Maximum discount amount (for percentage coupons)
- ✅ Discount type (FIXED or PERCENTAGE)
- ✅ Minimum cart size (number of items)
- ✅ Minimum total price required
- ✅ Product-specific restrictions
- ✅ Category-specific restrictions
- ✅ Auto-applied vs manual flag
- ✅ Maximum total uses (system-wide)
- ✅ Maximum uses per user
- ✅ Priority for auto-applied coupons

### Additional Features
- ✅ Pagination support for listing endpoints
- ✅ Swagger/OpenAPI documentation
- ✅ Health check endpoints (liveness & readiness probes)
- ✅ Configurable logging levels
- ✅ Full Docker support (App + Database + Redis)

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | v10 | Backend Framework |
| PostgreSQL | 15 | Primary Database |
| TypeORM | Latest | ORM |
| Redis | 7 | Distributed Locking |
| Swagger | OpenAPI 3 | API Documentation |
| Jest | Latest | Testing |
| TypeScript | 5.x | Language |
| Docker | Latest | Containerization |

## 📁 Project Structure

```
├── src/
│   ├── common/
│   │   ├── entities/          # Base entity
│   │   └── enums/             # CouponType, DiscountType
│   ├── config/                # App configurations
│   ├── modules/
│   │   ├── cart/              # Cart module
│   │   ├── coupons/           # Coupons module
│   │   ├── products/          # Products module
│   │   ├── health/            # Health checks
│   │   └── redis/             # Redis & distributed locking
│   ├── app.module.ts
│   └── main.ts
├── test/                      # Test files
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Development setup
├── docker-compose.prod.yml    # Production setup
└── env.example.txt            # Environment template
```

## 📚 API Documentation

Once the server is running, access the Swagger documentation at:
```
http://localhost:3000/api/docs
```

### Endpoints Overview

#### Cart Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cart/:customerId | Get cart with totals |
| POST | /cart/:customerId/items | Add item to cart |
| PUT | /cart/:customerId/items/:itemId | Update item quantity |
| DELETE | /cart/:customerId/items/:itemId | Remove item |
| DELETE | /cart/:customerId | Clear cart |
| POST | /cart/:customerId/coupons | Apply coupon |
| DELETE | /cart/:customerId/coupons | Remove coupon |

#### Coupon Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /coupons | List all coupons (paginated) |
| GET | /coupons/active | List active coupons |
| GET | /coupons/:id | Get coupon by ID |
| GET | /coupons/code/:code | Get coupon by code |
| POST | /coupons | Create coupon |
| PATCH | /coupons/:id | Update coupon |
| DELETE | /coupons/:id | Delete coupon |
| POST | /coupons/seed | Seed sample coupons |

#### Product Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /products | List all products (paginated) |
| GET | /products/:id | Get product by ID |
| POST | /products | Create product |
| PATCH | /products/:id | Update product |
| DELETE | /products/:id | Delete product |
| POST | /products/seed | Seed sample products |

#### Health Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Full health check |
| GET | /health/live | Liveness probe |
| GET | /health/ready | Readiness probe |

### Pagination

```bash
GET /products?page=2&limit=20
```

**Response:**
```json
{
  "products": [...],
  "metaData": {
    "page": 2,
    "limit": 20,
    "total": 50
  }
}
```

## 🚀 Getting Started

### Option 1: Full Docker Setup (Recommended) 🐳

Everything runs in Docker - no local installations needed!

```bash
# Clone & enter directory
git clone <repository-url>
cd ecommerce-cart-coupon-service

# Start everything (app + postgres + redis)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Seed sample data
curl -X POST http://localhost:3000/products/seed
curl -X POST http://localhost:3000/coupons/seed
```

**Access:**
- 🚀 API: http://localhost:3000
- 📚 Swagger: http://localhost:3000/api/docs

### Option 2: Local Development (with Docker for DB/Redis)

```bash
# Start only postgres & redis
docker-compose up -d postgres redis

# Install dependencies
npm install

# Copy environment
cp env.example.txt .env

# Run app locally (with hot-reload)
npm run start:dev
```

### Option 3: Fully Local (No Docker)

Install PostgreSQL 15+ and Redis 7+ locally, then:

```bash
npm install
cp env.example.txt .env
# Edit .env with your local DB/Redis settings
npm run start:dev
```

## 🐳 Docker

### Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (development & production) |
| `docker-compose.yml` | Development setup with hot-reload |
| `docker-compose.prod.yml` | Production setup (optimized) |
| `.dockerignore` | Excludes unnecessary files from build |

### Development

```bash
# Start all services
docker-compose up -d

# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis

# Stop all
docker-compose down

# Stop and remove data
docker-compose down -v
```

### Production

```bash
# Build and run production
docker-compose -f docker-compose.prod.yml up -d --build

# With custom password
DB_PASSWORD=secure_password docker-compose -f docker-compose.prod.yml up -d
```

### Docker Services

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| app | ecommerce_app | 3000 | NestJS Application |
| postgres | ecommerce_postgres | 5432 | PostgreSQL Database |
| redis | ecommerce_redis | 6379 | Redis (Distributed Locking) |

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| **Application** |
| PORT | 3000 | Server port |
| NODE_ENV | development | Environment mode |
| VERBOSE_LOGS | false | Show NestJS routing logs |
| **Database** |
| DB_HOST | localhost | PostgreSQL host (use `postgres` in Docker) |
| DB_PORT | 5432 | PostgreSQL port |
| DB_USERNAME | ecommerce | Database username |
| DB_PASSWORD | ecommerce_password | Database password |
| DB_DATABASE | ecommerce_cart_coupon | Database name |
| DB_SYNCHRONIZE | true | Auto-sync schema (⚠️ `false` in production!) |
| DB_LOGGING | false | Show SQL queries |
| **Redis** |
| REDIS_HOST | localhost | Redis host (use `redis` in Docker) |
| REDIS_PORT | 6379 | Redis port |
| REDIS_LOCK_DURATION | 10000 | Lock duration (ms) |
| REDIS_LOCK_RETRY_COUNT | 3 | Lock retry attempts |
| REDIS_LOCK_RETRY_DELAY | 200 | Retry delay (ms) |

## 🧪 Testing

```bash
# Run tests
npm run test

# With coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 📄 License

This project is licensed under the MIT License.
