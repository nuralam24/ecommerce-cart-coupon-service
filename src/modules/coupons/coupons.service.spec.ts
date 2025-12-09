import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponsService } from './coupons.service';
import { Coupon, CouponUsage } from './entities';
import { RedisLockService } from '../redis/redis-lock.service';
import { CouponValidationError } from './dto';
import { DiscountType, CouponType } from '@/common/enums';
import {
  createMockCoupon,
  createMockCart,
  createCartWithItems,
  createExpiredCoupon,
  createNotStartedCoupon,
  createAutoAppliedCoupon,
  createFixedAmountCoupon,
  createMinCartValueCoupon,
  createMaxUseCoupon,
} from '../../../test/mocks/mock-data';

describe('CouponsService', () => {
  let service: CouponsService;
  let couponRepository: jest.Mocked<Repository<Coupon>>;
  let couponUsageRepository: jest.Mocked<Repository<CouponUsage>>;
  let redisLockService: jest.Mocked<RedisLockService>;

  beforeEach(async () => {
    const mockCouponRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      increment: jest.fn(),
    };

    const mockCouponUsageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const mockRedisLockService = {
      withCouponUserLock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: getRepositoryToken(Coupon),
          useValue: mockCouponRepository,
        },
        {
          provide: getRepositoryToken(CouponUsage),
          useValue: mockCouponUsageRepository,
        },
        {
          provide: RedisLockService,
          useValue: mockRedisLockService,
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    couponRepository = module.get(getRepositoryToken(Coupon));
    couponUsageRepository = module.get(getRepositoryToken(CouponUsage));
    redisLockService = module.get(RedisLockService);
  });

  describe('validateCoupon', () => {
    const customerId = 'customer-1';

    it('should return invalid when coupon is not found', async () => {
      couponRepository.findOne.mockResolvedValue(null);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('INVALID', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.COUPON_NOT_FOUND);
    });

    it('should return invalid when coupon is inactive', async () => {
      const coupon = createMockCoupon({ isActive: false });
      couponRepository.findOne.mockResolvedValue(coupon);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('TEST10', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.COUPON_INACTIVE);
    });

    it('should return invalid when coupon has not started', async () => {
      const coupon = createNotStartedCoupon();
      couponRepository.findOne.mockResolvedValue(coupon);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('FUTURE', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.COUPON_NOT_STARTED);
    });

    it('should return invalid when coupon has expired', async () => {
      const coupon = createExpiredCoupon();
      couponRepository.findOne.mockResolvedValue(coupon);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('EXPIRED', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.COUPON_EXPIRED);
    });

    it('should return invalid when cart is empty', async () => {
      const coupon = createMockCoupon();
      couponRepository.findOne.mockResolvedValue(coupon);

      const cart = createMockCart({ items: [] });
      const result = await service.validateCoupon('TEST10', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.CART_EMPTY);
    });

    it('should return invalid when minimum cart items not met', async () => {
      const coupon = createMockCoupon({ minCartItems: 3 });
      couponRepository.findOne.mockResolvedValue(coupon);

      const cart = createCartWithItems(2, 100);
      const result = await service.validateCoupon('TEST10', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.MIN_CART_ITEMS_NOT_MET);
    });

    it('should return invalid when minimum cart value not met', async () => {
      const coupon = createMinCartValueCoupon(200);
      couponRepository.findOne.mockResolvedValue(coupon);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('MIN100', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.MIN_CART_VALUE_NOT_MET);
    });

    it('should return invalid when max total uses reached', async () => {
      const coupon = createMockCoupon({
        maxTotalUses: 100,
        currentTotalUses: 100,
      });
      couponRepository.findOne.mockResolvedValue(coupon);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('TEST10', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.MAX_TOTAL_USES_REACHED);
    });

    it('should return invalid when max user uses reached', async () => {
      const coupon = createMaxUseCoupon(1);
      couponRepository.findOne.mockResolvedValue(coupon);
      couponUsageRepository.count.mockResolvedValue(1);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('LIMITED', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.MAX_USER_USES_REACHED);
    });

    it('should return valid for a valid percentage coupon', async () => {
      const coupon = createMockCoupon({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
      });
      couponRepository.findOne.mockResolvedValue(coupon);
      couponUsageRepository.count.mockResolvedValue(0);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('TEST10', cart, customerId);

      expect(result.isValid).toBe(true);
      expect(result.calculatedDiscount).toBe(10); // 10% of 100
      expect(result.coupon?.discountType).toBe(DiscountType.PERCENTAGE);
    });

    it('should return valid for a valid fixed amount coupon', async () => {
      const coupon = createFixedAmountCoupon(20);
      couponRepository.findOne.mockResolvedValue(coupon);
      couponUsageRepository.count.mockResolvedValue(0);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('FLAT20', cart, customerId);

      expect(result.isValid).toBe(true);
      expect(result.calculatedDiscount).toBe(20);
      expect(result.coupon?.discountType).toBe(DiscountType.FIXED);
    });

    it('should return invalid when no applicable products in cart', async () => {
      const coupon = createMockCoupon({
        applicableProductIds: ['product-999'], // Product not in cart
      });
      couponRepository.findOne.mockResolvedValue(coupon);

      const cart = createCartWithItems(1, 100);
      const result = await service.validateCoupon('TEST10', cart, customerId);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(CouponValidationError.NO_APPLICABLE_PRODUCTS);
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      const coupon = createMockCoupon({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
      });

      const discount = service.calculateDiscount(coupon, 150);
      expect(discount).toBe(15); // 10% of 150
    });

    it('should cap percentage discount at maxDiscountAmount', () => {
      const coupon = createMockCoupon({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 50,
        maxDiscountAmount: 30,
      });

      const discount = service.calculateDiscount(coupon, 100);
      expect(discount).toBe(30); // 50% of 100 = 50, but capped at 30
    });

    it('should calculate fixed discount correctly', () => {
      const coupon = createFixedAmountCoupon(25);

      const discount = service.calculateDiscount(coupon, 100);
      expect(discount).toBe(25);
    });

    it('should not exceed cart total for fixed discount', () => {
      const coupon = createFixedAmountCoupon(50);

      const discount = service.calculateDiscount(coupon, 30);
      expect(discount).toBe(30); // Can't discount more than cart total
    });

    it('should round to 2 decimal places', () => {
      const coupon = createMockCoupon({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
      });

      const discount = service.calculateDiscount(coupon, 99.99);
      expect(discount).toBe(15); // 15% of 99.99 = 14.9985, rounded to 15.00
    });
  });

  describe('findBestAutoAppliedCoupon', () => {
    const customerId = 'customer-1';

    it('should return null when no auto-applied coupons exist', async () => {
      couponRepository.find.mockResolvedValue([]);

      const cart = createCartWithItems(1, 100);
      const result = await service.findBestAutoAppliedCoupon(cart, customerId);

      expect(result).toBeNull();
    });

    it('should return the coupon with highest discount', async () => {
      const coupon1 = createAutoAppliedCoupon({
        id: 'coupon-1',
        code: 'AUTO10',
        discountValue: 10,
        priority: 5,
      });
      const coupon2 = createAutoAppliedCoupon({
        id: 'coupon-2',
        code: 'AUTO20',
        discountValue: 20,
        priority: 5,
      });

      couponRepository.find.mockResolvedValue([coupon1, coupon2]);
      couponUsageRepository.count.mockResolvedValue(0);

      const cart = createCartWithItems(1, 100);
      const result = await service.findBestAutoAppliedCoupon(cart, customerId);

      expect(result).not.toBeNull();
      expect(result!.coupon.code).toBe('AUTO20');
      expect(result!.discount).toBe(20); // 20% of 100
    });

    it('should prefer higher priority when discounts are equal', async () => {
      const coupon1 = createAutoAppliedCoupon({
        id: 'coupon-1',
        code: 'AUTO10-LOW',
        discountValue: 10,
        priority: 5,
      });
      const coupon2 = createAutoAppliedCoupon({
        id: 'coupon-2',
        code: 'AUTO10-HIGH',
        discountValue: 10,
        priority: 10,
      });

      couponRepository.find.mockResolvedValue([coupon1, coupon2]);
      couponUsageRepository.count.mockResolvedValue(0);

      const cart = createCartWithItems(1, 100);
      const result = await service.findBestAutoAppliedCoupon(cart, customerId);

      expect(result).not.toBeNull();
      expect(result!.coupon.code).toBe('AUTO10-HIGH');
    });
  });

  describe('recordCouponUsage', () => {
    it('should record usage with lock', async () => {
      const coupon = createMockCoupon();
      const usage = {
        id: 'usage-1',
        couponId: coupon.id,
        customerId: 'customer-1',
        cartId: 'cart-1',
        discountApplied: 10,
        cartTotalAtApplication: 100,
        appliedAt: new Date(),
      };

      couponRepository.findOne.mockResolvedValue(coupon);
      couponUsageRepository.create.mockReturnValue(usage as any);
      couponUsageRepository.save.mockResolvedValue(usage as any);
      couponUsageRepository.count.mockResolvedValue(0);
      redisLockService.withCouponUserLock.mockImplementation(
        async (_, __, fn) => ({ success: true, result: await fn() }),
      );

      const result = await service.recordCouponUsage(
        coupon.id,
        'customer-1',
        'cart-1',
        10,
        100,
      );

      expect(result).toBeDefined();
      expect(couponRepository.increment).toHaveBeenCalled();
    });

    it('should throw error when lock cannot be acquired', async () => {
      redisLockService.withCouponUserLock.mockResolvedValue({
        success: false,
        reason: 'LOCK_NOT_ACQUIRED',
      });

      await expect(
        service.recordCouponUsage('coupon-1', 'customer-1', 'cart-1', 10, 100),
      ).rejects.toThrow('Unable to apply coupon at this time');
    });
  });
});

