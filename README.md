# E-Commerce Cart & Coupon Service

A comprehensive Cart and Coupon Service built with **TypeScript**, **NestJS**, **PostgreSQL**, **Redis** and **Docker**. This service allows customers to manage their shopping cart, apply coupons (both manual and auto-applied), and calculate total amounts after discounts with proper concurrency handling.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Getting Started](#-getting-started)
- [Docker](#-docker)
- [Environment Variables](#-environment-variables)
- [Why Redis?](#-why-redis)
- [Testing](#-testing)

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
- ✅ Auto-seed sample data on first run
- ✅ XSS & SQL Injection protection

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | v10 | Backend Framework |
| PostgreSQL | 15 | Primary Database |
| TypeORM | Latest | ORM |
| Redis | 7 | Distributed Locking (Concurrency) |
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
│   ├── middleware/            # XSS, SQL Injection protection
│   ├── modules/
│   │   ├── cart/              # Cart module
│   │   ├── coupons/           # Coupons module
│   │   ├── products/          # Products module
│   │   ├── health/            # Health checks
│   │   ├── redis/             # Redis & distributed locking
│   │   └── seeder/            # Auto-seed on startup
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

**Base URL:** `/api/v1`

#### Cart Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cart/:customerId | Get cart with totals |
| POST | /api/v1/cart/:customerId/items | Add item to cart |
| PUT | /api/v1/cart/:customerId/items/:itemId | Update item quantity |
| DELETE | /api/v1/cart/:customerId/items/:itemId | Remove item |
| DELETE | /api/v1/cart/:customerId | Clear cart |
| POST | /api/v1/cart/:customerId/coupons | Apply coupon |
| DELETE | /api/v1/cart/:customerId/coupons | Remove coupon |

#### Coupon Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/coupons | List all coupons (paginated) |
| GET | /api/v1/coupons/active | List active coupons |
| GET | /api/v1/coupons/:id | Get coupon by ID |
| GET | /api/v1/coupons/code/:code | Get coupon by code |
| POST | /api/v1/coupons | Create coupon |
| PATCH | /api/v1/coupons/:id | Update coupon |
| DELETE | /api/v1/coupons/:id | Delete coupon |
| POST | /api/v1/coupons/seed | Seed sample coupons |

#### Product Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/products | List all products (paginated) |
| GET | /api/v1/products/:id | Get product by ID |
| POST | /api/v1/products | Create product |
| PATCH | /api/v1/products/:id | Update product |
| DELETE | /api/v1/products/:id | Delete product |
| POST | /api/v1/products/seed | Seed sample products |

#### Health Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Full health check |
| GET | /api/v1/health/live | Liveness probe |
| GET | /api/v1/health/ready | Readiness probe |

### Pagination

```bash
GET /api/v1/products?page=2&limit=20
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

Everything runs in Docker with **auto-seeding** - no manual setup needed!

```bash
# Clone & enter directory
git clone <repository-url>
cd ecommerce-cart-coupon-service

# Start everything (app + postgres + redis)
docker-compose up -d

# That's it! Data auto-seeds on first run 🌱
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
| `docker-compose.yml` | Development setup with auto-seed |
| `docker-compose.prod.yml` | Production setup (optimized, no auto-seed) |
| `.dockerignore` | Excludes unnecessary files from build |

### Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Rebuild after code changes
docker-compose up -d --build

# Stop all
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v
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
| AUTO_SEED | true | Auto-seed sample data if DB is empty |
| **Database** |
| DB_HOST | localhost | PostgreSQL host (`postgres` in Docker) |
| DB_PORT | 5432 | PostgreSQL port |
| DB_USERNAME | ecommerce | Database username |
| DB_PASSWORD | ecommerce_password | Database password |
| DB_DATABASE | ecommerce_cart_coupon | Database name |
| DB_SYNCHRONIZE | true | Auto-sync schema (⚠️ `false` in production!) |
| DB_LOGGING | false | Show SQL queries |
| **Redis** |
| REDIS_HOST | localhost | Redis host (`redis` in Docker) |
| REDIS_PORT | 6379 | Redis port |
| REDIS_LOCK_DURATION | 10000 | Lock duration (ms) |
| REDIS_LOCK_RETRY_COUNT | 3 | Lock retry attempts |
| REDIS_LOCK_RETRY_DELAY | 200 | Retry delay (ms) |

## 🧪 Testing

```bash
# Run unit tests
npm run test

# With coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## 📄 License

This project is licensed under the MIT License.
