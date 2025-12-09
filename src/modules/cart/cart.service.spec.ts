import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart, CartItem } from './entities';
import { ProductsService } from '../products/products.service';
import { CouponsService } from '../coupons/coupons.service';
import { DiscountType, CouponType } from '@/common/enums';
import {
  createMockProduct,
  createMockCart,
  createMockCartItem,
  createMockCoupon,
  createCartWithItems,
  createAutoAppliedCoupon,
} from '../../../test/mocks/mock-data';

describe('CartService', () => {
  let service: CartService;
  let cartRepository: jest.Mocked<Repository<Cart>>;
  let cartItemRepository: jest.Mocked<Repository<CartItem>>;
  let productsService: jest.Mocked<ProductsService>;
  let couponsService: jest.Mocked<CouponsService>;

  beforeEach(async () => {
    const mockCartRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockCartItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };

    const mockProductsService = {
      findOne: jest.fn(),
    };

    const mockCouponsService = {
      validateCoupon: jest.fn(),
      validateCouponEntity: jest.fn(),
      findByCode: jest.fn(),
      findOne: jest.fn(),
      findBestAutoAppliedCoupon: jest.fn(),
      calculateDiscount: jest.fn(),
      recordCouponUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(Cart),
          useValue: mockCartRepository,
        },
        {
          provide: getRepositoryToken(CartItem),
          useValue: mockCartItemRepository,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartRepository = module.get(getRepositoryToken(Cart));
    cartItemRepository = module.get(getRepositoryToken(CartItem));
    productsService = module.get(ProductsService);
    couponsService = module.get(CouponsService);
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart if found', async () => {
      const existingCart = createMockCart();
      cartRepository.findOne.mockResolvedValue(existingCart);

      const result = await service.getOrCreateCart('customer-1');

      expect(result).toEqual(existingCart);
      expect(cartRepository.create).not.toHaveBeenCalled();
    });

    it('should create new cart if not found', async () => {
      const newCart = createMockCart();
      cartRepository.findOne.mockResolvedValue(null);
      cartRepository.create.mockReturnValue(newCart);
      cartRepository.save.mockResolvedValue(newCart);

      const result = await service.getOrCreateCart('customer-1');

      expect(result).toEqual(newCart);
      expect(cartRepository.create).toHaveBeenCalled();
      expect(cartRepository.save).toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', async () => {
      const product = createMockProduct({ stock: 50 });
      const cart = createMockCart({ items: [] });
      const cartItem = createMockCartItem({ product, quantity: 1 });

      productsService.findOne.mockResolvedValue(product);
      cartRepository.findOne
        .mockResolvedValueOnce(cart) // getOrCreateCart
        .mockResolvedValueOnce(cart) // getCartById after adding
        .mockResolvedValueOnce(cart); // getCartById final
      cartItemRepository.findOne.mockResolvedValue(null);
      cartItemRepository.create.mockReturnValue(cartItem);
      cartItemRepository.save.mockResolvedValue(cartItem);
      couponsService.findBestAutoAppliedCoupon.mockResolvedValue(null);

      const result = await service.addItem('customer-1', {
        productId: product.id,
        quantity: 1,
      });

      expect(result).toBeDefined();
      expect(cartItemRepository.create).toHaveBeenCalled();
      expect(cartItemRepository.save).toHaveBeenCalled();
    });

    it('should update quantity if item already exists', async () => {
      const product = createMockProduct({ stock: 50 });
      const existingItem = createMockCartItem({ product, quantity: 1 });
      const cart = createMockCart({ items: [existingItem] });

      productsService.findOne.mockResolvedValue(product);
      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.findOne.mockResolvedValue(existingItem);
      cartItemRepository.save.mockResolvedValue({ ...existingItem, quantity: 2 } as any);
      couponsService.findBestAutoAppliedCoupon.mockResolvedValue(null);

      const result = await service.addItem('customer-1', {
        productId: product.id,
        quantity: 1,
      });

      expect(result).toBeDefined();
      expect(cartItemRepository.create).not.toHaveBeenCalled();
      expect(cartItemRepository.save).toHaveBeenCalled();
    });

    it('should throw error for inactive product', async () => {
      const product = createMockProduct({ isActive: false });
      const cart = createMockCart();

      productsService.findOne.mockResolvedValue(product);
      cartRepository.findOne.mockResolvedValue(cart);

      await expect(
        service.addItem('customer-1', { productId: product.id, quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for insufficient stock', async () => {
      const product = createMockProduct({ stock: 5 });
      const cart = createMockCart();

      productsService.findOne.mockResolvedValue(product);
      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addItem('customer-1', { productId: product.id, quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateItem', () => {
    it('should update cart item quantity', async () => {
      const product = createMockProduct({ stock: 50 });
      const cartItem = createMockCartItem({ product, quantity: 1 });
      const cart = createMockCart({ items: [cartItem] });

      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.findOne.mockResolvedValue(cartItem);
      cartItemRepository.save.mockResolvedValue({ ...cartItem, quantity: 5 } as any);
      couponsService.findBestAutoAppliedCoupon.mockResolvedValue(null);

      const result = await service.updateItem('customer-1', cartItem.id, { quantity: 5 });

      expect(result).toBeDefined();
      expect(cartItemRepository.save).toHaveBeenCalled();
    });

    it('should throw error if cart item not found', async () => {
      const cart = createMockCart();

      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem('customer-1', 'non-existent-id', { quantity: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for insufficient stock on update', async () => {
      const product = createMockProduct({ stock: 5 });
      const cartItem = createMockCartItem({ product, quantity: 1 });
      const cart = createMockCart({ items: [cartItem] });

      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.findOne.mockResolvedValue(cartItem);

      await expect(
        service.updateItem('customer-1', cartItem.id, { quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const cartItem = createMockCartItem();
      const cart = createMockCart({ items: [cartItem] });

      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.findOne.mockResolvedValue(cartItem);
      cartItemRepository.remove.mockResolvedValue(cartItem);
      couponsService.findBestAutoAppliedCoupon.mockResolvedValue(null);

      const result = await service.removeItem('customer-1', cartItem.id);

      expect(result).toBeDefined();
      expect(cartItemRepository.remove).toHaveBeenCalledWith(cartItem);
    });

    it('should throw error if cart item not found', async () => {
      const cart = createMockCart();

      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem('customer-1', 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyCoupon', () => {
    it('should apply valid coupon to cart', async () => {
      const coupon = createMockCoupon();
      const cart = createCartWithItems(1, 100);

      cartRepository.findOne.mockResolvedValue(cart);
      couponsService.validateCoupon.mockResolvedValue({
        isValid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          couponType: coupon.couponType,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          maxDiscountAmount: null,
        },
        calculatedDiscount: 10,
      });
      couponsService.findByCode.mockResolvedValue(coupon);
      couponsService.recordCouponUsage.mockResolvedValue({} as any);
      cartRepository.save.mockResolvedValue({
        ...cart,
        appliedCouponId: coupon.id,
        appliedCoupon: coupon,
      } as any);
      couponsService.calculateDiscount.mockReturnValue(10);

      const result = await service.applyCoupon('customer-1', { couponCode: 'TEST10' });

      expect(result).toBeDefined();
      expect(couponsService.validateCoupon).toHaveBeenCalled();
      expect(couponsService.recordCouponUsage).toHaveBeenCalled();
    });

    it('should throw error for invalid coupon', async () => {
      const cart = createCartWithItems(1, 100);

      cartRepository.findOne.mockResolvedValue(cart);
      couponsService.validateCoupon.mockResolvedValue({
        isValid: false,
        errorMessage: 'Coupon expired',
      });

      await expect(
        service.applyCoupon('customer-1', { couponCode: 'EXPIRED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when applying coupon to empty cart', async () => {
      const cart = createMockCart({ items: [] });

      cartRepository.findOne.mockResolvedValue(cart);

      await expect(
        service.applyCoupon('customer-1', { couponCode: 'TEST10' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeCoupon', () => {
    it('should remove applied coupon', async () => {
      const coupon = createMockCoupon();
      const cart = createCartWithItems(1, 100);
      cart.appliedCoupon = coupon;
      cart.appliedCouponId = coupon.id;

      cartRepository.findOne
        .mockResolvedValueOnce(cart) // getOrCreateCart
        .mockResolvedValueOnce({ ...cart, appliedCoupon: null, appliedCouponId: null } as any) // after save
        .mockResolvedValueOnce({ ...cart, appliedCoupon: null, appliedCouponId: null } as any); // final
      cartRepository.save.mockResolvedValue({
        ...cart,
        appliedCoupon: null,
        appliedCouponId: null,
      } as any);
      couponsService.findBestAutoAppliedCoupon.mockResolvedValue(null);

      const result = await service.removeCoupon('customer-1');

      expect(result).toBeDefined();
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('should throw error when no coupon applied', async () => {
      const cart = createMockCart();

      cartRepository.findOne.mockResolvedValue(cart);

      await expect(service.removeCoupon('customer-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('clearCart', () => {
    it('should clear all items and coupon from cart', async () => {
      const cart = createCartWithItems(3, 100);
      cart.appliedCoupon = createMockCoupon();
      cart.appliedCouponId = cart.appliedCoupon.id;

      cartRepository.findOne.mockResolvedValue(cart);
      cartItemRepository.delete.mockResolvedValue({ affected: 3, raw: [] });
      cartRepository.save.mockResolvedValue({
        ...cart,
        items: [],
        appliedCoupon: null,
        appliedCouponId: null,
      } as any);

      const result = await service.clearCart('customer-1');

      expect(result).toBeDefined();
      expect(cartItemRepository.delete).toHaveBeenCalled();
      expect(cartRepository.save).toHaveBeenCalled();
    });
  });

  describe('Auto-applied coupons', () => {
    it('should auto-apply best coupon when cart is modified', async () => {
      const product = createMockProduct({ stock: 50 });
      const autoCoupon = createAutoAppliedCoupon();
      const cart = createMockCart({ items: [] });
      const cartItem = createMockCartItem({ product, quantity: 1 });
      const cartWithItem = createMockCart({ items: [cartItem] });

      productsService.findOne.mockResolvedValue(product);
      // Mock for getOrCreateCart, getCartById (revalidate), getCartById (final)
      cartRepository.findOne
        .mockResolvedValueOnce(cart) // getOrCreateCart
        .mockResolvedValueOnce(cartWithItem) // getCartById after adding
        .mockResolvedValueOnce({
          ...cartWithItem,
          appliedCoupon: autoCoupon,
          appliedCouponId: autoCoupon.id,
          isCouponAutoApplied: true,
        } as any); // getCartById final
      cartItemRepository.findOne.mockResolvedValue(null);
      cartItemRepository.create.mockReturnValue(cartItem);
      cartItemRepository.save.mockResolvedValue(cartItem);
      couponsService.findBestAutoAppliedCoupon.mockResolvedValue({
        coupon: autoCoupon,
        discount: 15,
      });
      couponsService.validateCouponEntity.mockResolvedValue({
        isValid: true,
        calculatedDiscount: 15,
      });
      couponsService.calculateDiscount.mockReturnValue(15);
      cartRepository.save.mockResolvedValue({
        ...cart,
        items: [cartItem],
        appliedCoupon: autoCoupon,
        appliedCouponId: autoCoupon.id,
        isCouponAutoApplied: true,
      } as any);

      const result = await service.addItem('customer-1', {
        productId: product.id,
        quantity: 1,
      });

      expect(result).toBeDefined();
      expect(couponsService.findBestAutoAppliedCoupon).toHaveBeenCalled();
    });
  });

  describe('Cart calculations', () => {
    it('should calculate correct totals with percentage discount', async () => {
      const coupon = createMockCoupon({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
      });
      const cart = createCartWithItems(2, 100); // 2 items at $100 each = $200 total
      cart.appliedCoupon = coupon;
      cart.appliedCouponId = coupon.id;

      cartRepository.findOne.mockResolvedValue(cart);
      couponsService.calculateDiscount.mockReturnValue(20); // 10% of 200

      const result = await service.getCart('customer-1');

      expect(result.summary.totalPriceBeforeDiscount).toBe(200);
      expect(result.summary.discountAmount).toBe(20);
      expect(result.summary.finalPayableAmount).toBe(180);
    });

    it('should calculate correct totals with fixed discount', async () => {
      const coupon = createMockCoupon({
        discountType: DiscountType.FIXED,
        discountValue: 50,
      });
      const cart = createCartWithItems(2, 100); // $200 total
      cart.appliedCoupon = coupon;
      cart.appliedCouponId = coupon.id;

      cartRepository.findOne.mockResolvedValue(cart);
      couponsService.calculateDiscount.mockReturnValue(50);

      const result = await service.getCart('customer-1');

      expect(result.summary.totalPriceBeforeDiscount).toBe(200);
      expect(result.summary.discountAmount).toBe(50);
      expect(result.summary.finalPayableAmount).toBe(150);
    });

    it('should return zero discount when no coupon applied', async () => {
      const cart = createCartWithItems(1, 100);
      cart.appliedCoupon = null;
      cart.appliedCouponId = null;

      cartRepository.findOne.mockResolvedValue(cart);
      couponsService.findBestAutoAppliedCoupon.mockResolvedValue(null);

      const result = await service.getCart('customer-1');

      expect(result.summary.totalPriceBeforeDiscount).toBe(100);
      expect(result.summary.discountAmount).toBe(0);
      expect(result.summary.finalPayableAmount).toBe(100);
    });
  });
});

