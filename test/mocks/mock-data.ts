import { Product } from '../../src/modules/products/entities/product.entity';
import { Cart } from '../../src/modules/cart/entities/cart.entity';
import { CartItem } from '../../src/modules/cart/entities/cart-item.entity';
import { Coupon } from '../../src/modules/coupons/entities/coupon.entity';
import { DiscountType, CouponType } from '../../src/common/enums';

/**
 * Test data factory for creating mock entities
 */

export const createMockProduct = (overrides: Partial<Product> = {}): Product => {
  const product = new Product();
  Object.assign(product, {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test Description',
    price: 100,
    sku: 'TEST-001',
    category: 'Electronics',
    stock: 50,
    isActive: true,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return product;
};

export const createMockCartItem = (overrides: Partial<CartItem> = {}): CartItem => {
  const cartItem = new CartItem();
  const product = createMockProduct(overrides.product as Partial<Product>);
  Object.assign(cartItem, {
    id: 'cart-item-1',
    cartId: 'cart-1',
    productId: product.id,
    quantity: 1,
    product,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return cartItem;
};

export const createMockCart = (overrides: Partial<Cart> = {}): Cart => {
  const cart = new Cart();
  Object.assign(cart, {
    id: 'cart-1',
    customerId: 'customer-1',
    sessionId: null,
    isActive: true,
    items: [],
    appliedCoupon: null,
    appliedCouponId: null,
    isCouponAutoApplied: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return cart;
};

export const createMockCoupon = (overrides: Partial<Coupon> = {}): Coupon => {
  const coupon = new Coupon();
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  Object.assign(coupon, {
    id: 'coupon-1',
    code: 'TEST10',
    name: 'Test Coupon 10%',
    description: 'Test coupon description',
    couponType: CouponType.GENERAL,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    maxDiscountAmount: null,
    startTime: pastDate,
    expiryTime: futureDate,
    minCartItems: 0,
    minCartValue: 0,
    applicableProductIds: null,
    applicableCategories: null,
    maxTotalUses: null,
    currentTotalUses: 0,
    maxUsesPerUser: null,
    isActive: true,
    priority: 0,
    usages: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
  return coupon;
};

export const createCartWithItems = (
  itemCount: number = 1,
  pricePerItem: number = 100,
): Cart => {
  const items: CartItem[] = [];
  
  for (let i = 0; i < itemCount; i++) {
    const product = createMockProduct({
      id: `product-${i + 1}`,
      name: `Product ${i + 1}`,
      price: pricePerItem,
    });
    
    const item = createMockCartItem({
      id: `cart-item-${i + 1}`,
      productId: product.id,
      product,
      quantity: 1,
    });
    
    items.push(item);
  }

  return createMockCart({ items });
};

export const createExpiredCoupon = (): Coupon => {
  const now = new Date();
  return createMockCoupon({
    code: 'EXPIRED',
    startTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    expiryTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  });
};

export const createNotStartedCoupon = (): Coupon => {
  const now = new Date();
  return createMockCoupon({
    code: 'FUTURE',
    startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    expiryTime: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  });
};

export const createAutoAppliedCoupon = (overrides: Partial<Coupon> = {}): Coupon => {
  return createMockCoupon({
    code: 'AUTO15',
    name: 'Auto 15% Off',
    couponType: CouponType.AUTO_APPLIED,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 15,
    priority: 10,
    ...overrides,
  });
};

export const createFixedAmountCoupon = (amount: number = 20): Coupon => {
  return createMockCoupon({
    code: 'FLAT20',
    name: `$${amount} Off`,
    discountType: DiscountType.FIXED,
    discountValue: amount,
  });
};

export const createMinCartValueCoupon = (minValue: number = 100): Coupon => {
  return createMockCoupon({
    code: 'MIN100',
    name: '10% Off on Orders Over $100',
    discountValue: 10,
    minCartValue: minValue,
  });
};

export const createMaxUseCoupon = (maxUses: number = 2): Coupon => {
  return createMockCoupon({
    code: 'LIMITED',
    name: 'Limited Use Coupon',
    maxUsesPerUser: maxUses,
  });
};

