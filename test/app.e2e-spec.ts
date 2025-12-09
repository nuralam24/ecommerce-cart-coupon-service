import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * E2E Tests for the Cart & Coupon Service
 * 
 * These tests cover the full integration of all modules working together.
 * Run with: npm run test:e2e
 * 
 * Prerequisites:
 * - PostgreSQL and Redis must be running
 * - Database should be clean or test database used
 */
describe('Cart & Coupon Service (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let productIds: string[] = [];
  let couponIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Clean up test data
    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM coupon_usages');
      await dataSource.query('DELETE FROM cart_items');
      await dataSource.query('DELETE FROM carts');
      await dataSource.query('DELETE FROM coupons');
      await dataSource.query('DELETE FROM products');
    }
    await app.close();
  });

  describe('Products Module', () => {
    it('/products (POST) - should create a product', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Test Product',
          description: 'A test product for e2e testing',
          price: 99.99,
          sku: 'TEST-E2E-001',
          category: 'Electronics',
          stock: 100,
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Product');
      expect(response.body.price).toBe('99.99');
      productIds.push(response.body.id);
    });

    it('/products (POST) - should create second product', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Another Product',
          description: 'Another test product',
          price: 49.99,
          sku: 'TEST-E2E-002',
          category: 'Accessories',
          stock: 50,
          isActive: true,
        })
        .expect(201);

      productIds.push(response.body.id);
    });

    it('/products (GET) - should get all products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('/products/:id (GET) - should get a product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productIds[0]}`)
        .expect(200);

      expect(response.body.id).toBe(productIds[0]);
    });

    it('/products/:id (GET) - should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('Coupons Module', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    it('/coupons (POST) - should create a percentage coupon', async () => {
      const response = await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_PERCENT10',
          name: '10% Off',
          description: 'E2E test percentage coupon',
          couponType: 'GENERAL',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          maxDiscountAmount: 50,
          startTime: pastDate,
          expiryTime: futureDate,
          minCartItems: 1,
          minCartValue: 50,
          maxUsesPerUser: 3,
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe('E2E_PERCENT10');
      expect(response.body.discountType).toBe('PERCENTAGE');
      couponIds.push(response.body.id);
    });

    it('/coupons (POST) - should create a fixed amount coupon', async () => {
      const response = await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_FLAT20',
          name: '$20 Off',
          description: 'E2E test fixed coupon',
          couponType: 'GENERAL',
          discountType: 'FIXED',
          discountValue: 20,
          startTime: pastDate,
          expiryTime: futureDate,
          minCartValue: 100,
          maxUsesPerUser: 1,
          isActive: true,
        })
        .expect(201);

      expect(response.body.discountType).toBe('FIXED');
      couponIds.push(response.body.id);
    });

    it('/coupons (POST) - should create an auto-applied coupon', async () => {
      const response = await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_AUTO15',
          name: 'Auto 15% Off',
          description: 'Auto-applied coupon for e2e testing',
          couponType: 'AUTO_APPLIED',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          maxDiscountAmount: 30,
          startTime: pastDate,
          expiryTime: futureDate,
          minCartValue: 75,
          priority: 10,
          isActive: true,
        })
        .expect(201);

      expect(response.body.couponType).toBe('AUTO_APPLIED');
      couponIds.push(response.body.id);
    });

    it('/coupons (POST) - should reject duplicate coupon code', async () => {
      await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_PERCENT10',
          name: 'Duplicate',
          couponType: 'GENERAL',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          startTime: pastDate,
          expiryTime: futureDate,
        })
        .expect(400);
    });

    it('/coupons (GET) - should get all coupons', async () => {
      const response = await request(app.getHttpServer())
        .get('/coupons')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('/coupons/active (GET) - should get active coupons', async () => {
      const response = await request(app.getHttpServer())
        .get('/coupons/active')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((coupon: any) => {
        expect(coupon.isActive).toBe(true);
      });
    });

    it('/coupons/code/:code (GET) - should get coupon by code', async () => {
      const response = await request(app.getHttpServer())
        .get('/coupons/code/E2E_PERCENT10')
        .expect(200);

      expect(response.body.code).toBe('E2E_PERCENT10');
    });
  });

  describe('Cart Module - Basic Operations', () => {
    const customerId = 'e2e-test-customer-1';

    it('/cart/:customerId (GET) - should create and get empty cart', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cart/${customerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.customerId).toBe(customerId);
      expect(response.body.items).toEqual([]);
      expect(response.body.summary.totalPriceBeforeDiscount).toBe(0);
      expect(response.body.summary.finalPayableAmount).toBe(0);
    });

    it('/cart/:customerId/items (POST) - should add item to cart', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[0],
          quantity: 2,
        })
        .expect(201);

      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].quantity).toBe(2);
      expect(response.body.summary.totalItems).toBe(2);
    });

    it('/cart/:customerId/items (POST) - should increase quantity for existing item', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[0],
          quantity: 1,
        })
        .expect(201);

      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].quantity).toBe(3);
    });

    it('/cart/:customerId/items (POST) - should add different product', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[1],
          quantity: 2,
        })
        .expect(201);

      expect(response.body.items.length).toBe(2);
      expect(response.body.summary.totalItems).toBe(5);
    });

    it('/cart/:customerId (GET) - should calculate correct totals', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cart/${customerId}`)
        .expect(200);

      // 3 x 99.99 + 2 x 49.99 = 299.97 + 99.98 = 399.95
      const expectedTotal = 3 * 99.99 + 2 * 49.99;
      expect(response.body.summary.totalPriceBeforeDiscount).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Cart Module - Update and Remove', () => {
    const customerId = 'e2e-test-customer-2';
    let cartItemId: string;

    beforeAll(async () => {
      // Add item to cart first
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[0],
          quantity: 3,
        });
      cartItemId = response.body.items[0].id;
    });

    it('/cart/:customerId/items/:itemId (PUT) - should update item quantity', async () => {
      const response = await request(app.getHttpServer())
        .put(`/cart/${customerId}/items/${cartItemId}`)
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.items[0].quantity).toBe(5);
    });

    it('/cart/:customerId/items/:itemId (PUT) - should reject insufficient stock', async () => {
      await request(app.getHttpServer())
        .put(`/cart/${customerId}/items/${cartItemId}`)
        .send({ quantity: 1000 })
        .expect(400);
    });

    it('/cart/:customerId/items/:itemId (DELETE) - should remove item', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/cart/${customerId}/items/${cartItemId}`)
        .expect(200);

      expect(response.body.items.length).toBe(0);
    });

    it('/cart/:customerId/items/:itemId (DELETE) - should return 404 for non-existent item', async () => {
      await request(app.getHttpServer())
        .delete(`/cart/${customerId}/items/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });
  });

  describe('Cart Module - Manual Coupon Application', () => {
    const customerId = 'e2e-test-customer-3';

    beforeAll(async () => {
      // Add items worth enough for coupon
      await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[0],
          quantity: 2, // 2 x 99.99 = 199.98
        });
    });

    it('/cart/:customerId/coupons (POST) - should apply valid coupon', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/coupons`)
        .send({ couponCode: 'E2E_PERCENT10' })
        .expect(201);

      expect(response.body.appliedCoupon).toBeDefined();
      expect(response.body.appliedCoupon.code).toBe('E2E_PERCENT10');
      expect(response.body.appliedCoupon.isAutoApplied).toBe(false);
      expect(response.body.summary.discountAmount).toBeGreaterThan(0);
      expect(response.body.summary.finalPayableAmount).toBeLessThan(
        response.body.summary.totalPriceBeforeDiscount,
      );
    });

    it('/cart/:customerId/coupons (POST) - should reject invalid coupon', async () => {
      await request(app.getHttpServer())
        .post(`/cart/${customerId}/coupons`)
        .send({ couponCode: 'INVALID_COUPON' })
        .expect(400);
    });

    it('/cart/:customerId/coupons (DELETE) - should remove applied coupon', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/cart/${customerId}/coupons`)
        .expect(200);

      // After removing manual coupon, auto-applied might kick in
      // since cart total (199.98) > 75 (minCartValue for AUTO15)
      if (response.body.appliedCoupon) {
        expect(response.body.appliedCoupon.code).toBe('E2E_AUTO15');
        expect(response.body.appliedCoupon.isAutoApplied).toBe(true);
      }
    });
  });

  describe('Cart Module - Auto-Applied Coupon', () => {
    const customerId = 'e2e-test-customer-4';

    it('should not auto-apply coupon below min cart value', async () => {
      // Add one cheap item (49.99 < 75 min)
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[1], // 49.99
          quantity: 1,
        })
        .expect(201);

      // Auto coupon requires minCartValue of 75
      expect(response.body.appliedCoupon).toBeNull();
    });

    it('should auto-apply coupon when min cart value is met', async () => {
      // Add more items to exceed min value
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[0], // 99.99
          quantity: 1,
        })
        .expect(201);

      // Total: 49.99 + 99.99 = 149.98 > 75
      expect(response.body.appliedCoupon).toBeDefined();
      expect(response.body.appliedCoupon.code).toBe('E2E_AUTO15');
      expect(response.body.appliedCoupon.isAutoApplied).toBe(true);
    });

    it('should remove auto-applied coupon when cart falls below min value', async () => {
      // First get the current cart to find item IDs
      const cartResponse = await request(app.getHttpServer())
        .get(`/cart/${customerId}`)
        .expect(200);

      const expensiveItemId = cartResponse.body.items.find(
        (item: any) => item.productId === productIds[0],
      )?.id;

      // Remove the expensive item
      const response = await request(app.getHttpServer())
        .delete(`/cart/${customerId}/items/${expensiveItemId}`)
        .expect(200);

      // Cart total now 49.99 < 75 min
      expect(response.body.appliedCoupon).toBeNull();
    });
  });

  describe('Cart Module - Clear Cart', () => {
    const customerId = 'e2e-test-customer-5';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[0],
          quantity: 3,
        });
    });

    it('/cart/:customerId (DELETE) - should clear all items', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/cart/${customerId}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.appliedCoupon).toBeNull();
      expect(response.body.summary.totalPriceBeforeDiscount).toBe(0);
      expect(response.body.summary.finalPayableAmount).toBe(0);
    });
  });

  describe('Coupon Validation Rules', () => {
    const customerId = 'e2e-test-customer-6';
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const futureStartDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    beforeAll(async () => {
      // Create expired coupon
      await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_EXPIRED',
          name: 'Expired Coupon',
          couponType: 'GENERAL',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          startTime: pastDate,
          expiryTime: expiredDate,
          isActive: true,
        });

      // Create not-yet-started coupon
      await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_FUTURE',
          name: 'Future Coupon',
          couponType: 'GENERAL',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          startTime: futureStartDate,
          expiryTime: futureDate,
          isActive: true,
        });

      // Create inactive coupon
      await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_INACTIVE',
          name: 'Inactive Coupon',
          couponType: 'GENERAL',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          startTime: pastDate,
          expiryTime: futureDate,
          isActive: false,
        });

      // Create min items coupon
      await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_MIN_ITEMS',
          name: 'Min 5 Items Coupon',
          couponType: 'GENERAL',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          startTime: pastDate,
          expiryTime: futureDate,
          minCartItems: 5,
          isActive: true,
        });

      // Add item to cart
      await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[0],
          quantity: 2,
        });
    });

    it('should reject expired coupon', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/coupons`)
        .send({ couponCode: 'E2E_EXPIRED' })
        .expect(400);

      expect(response.body.message).toContain('expired');
    });

    it('should reject not-yet-started coupon', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/coupons`)
        .send({ couponCode: 'E2E_FUTURE' })
        .expect(400);

      expect(response.body.message).toContain('not yet active');
    });

    it('should reject inactive coupon', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/coupons`)
        .send({ couponCode: 'E2E_INACTIVE' })
        .expect(400);

      expect(response.body.message).toContain('no longer active');
    });

    it('should reject coupon when min cart items not met', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/coupons`)
        .send({ couponCode: 'E2E_MIN_ITEMS' })
        .expect(400);

      expect(response.body.message).toContain('items required');
    });
  });

  describe('Discount Calculation', () => {
    const customerId = 'e2e-test-customer-7';
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    beforeAll(async () => {
      // Create coupon with max discount cap
      await request(app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'E2E_CAPPED',
          name: '50% Off Capped at $30',
          couponType: 'GENERAL',
          discountType: 'PERCENTAGE',
          discountValue: 50,
          maxDiscountAmount: 30,
          startTime: pastDate,
          expiryTime: futureDate,
          isActive: true,
        });

      // Add items to cart (2 x 99.99 = 199.98)
      await request(app.getHttpServer())
        .post(`/cart/${customerId}/items`)
        .send({
          productId: productIds[0],
          quantity: 2,
        });
    });

    it('should cap percentage discount at max amount', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/coupons`)
        .send({ couponCode: 'E2E_CAPPED' })
        .expect(201);

      // 50% of 199.98 = 99.99, but capped at 30
      expect(response.body.summary.discountAmount).toBe(30);
    });

    it('should calculate fixed discount correctly', async () => {
      // Remove existing coupon
      await request(app.getHttpServer())
        .delete(`/cart/${customerId}/coupons`);

      // Apply fixed discount coupon
      const response = await request(app.getHttpServer())
        .post(`/cart/${customerId}/coupons`)
        .send({ couponCode: 'E2E_FLAT20' })
        .expect(201);

      expect(response.body.summary.discountAmount).toBe(20);
    });
  });
});

