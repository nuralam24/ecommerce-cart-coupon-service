import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Coupon, CouponUsage } from './entities';
import { CreateCouponDto, UpdateCouponDto, CouponValidationResultDto, CouponValidationError } from './dto';
import { Cart } from '../cart/entities';
import { DiscountType, CouponType } from '@/common/enums';
import { RedisLockService } from '../redis/redis-lock.service';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly couponUsageRepository: Repository<CouponUsage>,
    private readonly redisLockService: RedisLockService,
  ) {}

  /**
   * Create a new coupon
   */
  async create(createCouponDto: CreateCouponDto): Promise<Coupon> {
    // Validate expiry is after start time
    if (createCouponDto.expiryTime <= createCouponDto.startTime) {
      throw new BadRequestException('Expiry time must be after start time');
    }

    // Check for duplicate code
    const existing = await this.couponRepository.findOne({
      where: { code: createCouponDto.code },
    });
    if (existing) {
      throw new BadRequestException(`Coupon with code "${createCouponDto.code}" already exists`);
    }

    const coupon = this.couponRepository.create(createCouponDto);
    return this.couponRepository.save(coupon);
  }

  /**
   * Find all coupons
   */
  async findAll(page: number, limit: number): Promise<{ coupons: Coupon[], metaData: { page: number, limit: number, total: number } }   > {
    const [coupons, total] = await this.couponRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      coupons,
      metaData: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Find active coupons only
   */
  async findActive(): Promise<Coupon[]> {
    const now = new Date();
    return this.couponRepository.find({
      where: {
        isActive: true,
        startTime: LessThanOrEqual(now),
        expiryTime: MoreThanOrEqual(now),
      },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Find a coupon by ID
   */
  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { id },
    });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" not found`);
    }
    return coupon;
  }

  /**
   * Find a coupon by code
   */
  async findByCode(code: string): Promise<Coupon | null> {
    return this.couponRepository.findOne({
      where: { code: code.toUpperCase() },
    });
  }

  /**
   * Update a coupon
   */
  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);

    // Validate code uniqueness if changed
    if (updateCouponDto.code && updateCouponDto.code !== coupon.code) {
      const existing = await this.couponRepository.findOne({
        where: { code: updateCouponDto.code },
      });
      if (existing) {
        throw new BadRequestException(`Coupon with code "${updateCouponDto.code}" already exists`);
      }
    }

    Object.assign(coupon, updateCouponDto);
    return this.couponRepository.save(coupon);
  }

  /**
   * Delete a coupon
   */
  async remove(id: string): Promise<void> {
    const coupon = await this.findOne(id);
    await this.couponRepository.remove(coupon);
  }

  /**
   * Validate a coupon for a given cart and customer
   * This is the core validation logic that checks all coupon rules
   */
  async validateCoupon(
    couponCode: string,
    cart: Cart,
    customerId: string,
  ): Promise<CouponValidationResultDto> {
    // Find coupon by code
    const coupon = await this.findByCode(couponCode);
    if (!coupon) {
      return {
        isValid: false,
        errorCode: CouponValidationError.COUPON_NOT_FOUND,
        errorMessage: `Coupon "${couponCode}" not found`,
      };
    }

    return this.validateCouponEntity(coupon, cart, customerId);
  }

  /**
   * Validate a coupon entity against cart and customer rules
   */
  async validateCouponEntity(
    coupon: Coupon,
    cart: Cart,
    customerId: string,
  ): Promise<CouponValidationResultDto> {
    const now = new Date();

    // Check if coupon is active
    if (!coupon.isActive) {
      return {
        isValid: false,
        errorCode: CouponValidationError.COUPON_INACTIVE,
        errorMessage: 'This coupon is no longer active',
      };
    }

    // Check if coupon has started
    if (now < coupon.startTime) {
      return {
        isValid: false,
        errorCode: CouponValidationError.COUPON_NOT_STARTED,
        errorMessage: `This coupon is not yet active. It starts on ${coupon.startTime.toISOString()}`,
      };
    }

    // Check if coupon has expired
    if (now > coupon.expiryTime) {
      return {
        isValid: false,
        errorCode: CouponValidationError.COUPON_EXPIRED,
        errorMessage: 'This coupon has expired',
      };
    }

    // Check if cart is empty
    if (!cart.items || cart.items.length === 0) {
      return {
        isValid: false,
        errorCode: CouponValidationError.CART_EMPTY,
        errorMessage: 'Cannot apply coupon to an empty cart',
      };
    }

    // Check minimum cart items
    if (cart.totalItems < coupon.minCartItems) {
      return {
        isValid: false,
        errorCode: CouponValidationError.MIN_CART_ITEMS_NOT_MET,
        errorMessage: `Minimum ${coupon.minCartItems} items required. You have ${cart.totalItems} items`,
      };
    }

    // Calculate applicable cart total (considering product restrictions)
    const { applicableTotal, applicableProductIds } = this.calculateApplicableCartTotal(cart, coupon);

    // Check minimum cart value
    if (applicableTotal < Number(coupon.minCartValue)) {
      return {
        isValid: false,
        errorCode: CouponValidationError.MIN_CART_VALUE_NOT_MET,
        errorMessage: `Minimum cart value of $${coupon.minCartValue} required. Applicable total is $${applicableTotal.toFixed(2)}`,
      };
    }

    // Check product restrictions
    if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
      const hasApplicableProducts = cart.items.some(
        (item) => coupon.applicableProductIds!.includes(item.productId),
      );
      if (!hasApplicableProducts) {
        return {
          isValid: false,
          errorCode: CouponValidationError.NO_APPLICABLE_PRODUCTS,
          errorMessage: 'This coupon does not apply to any products in your cart',
        };
      }
    }

    // Check max total uses (system-wide)
    if (coupon.maxTotalUses !== null && coupon.currentTotalUses >= coupon.maxTotalUses) {
      return {
        isValid: false,
        errorCode: CouponValidationError.MAX_TOTAL_USES_REACHED,
        errorMessage: 'This coupon has reached its maximum usage limit',
      };
    }

    // Check max uses per user
    if (coupon.maxUsesPerUser !== null) {
      const userUsageCount = await this.getUserUsageCount(coupon.id, customerId);
      if (userUsageCount >= coupon.maxUsesPerUser) {
        return {
          isValid: false,
          errorCode: CouponValidationError.MAX_USER_USES_REACHED,
          errorMessage: `You have already used this coupon ${userUsageCount} time(s). Maximum allowed: ${coupon.maxUsesPerUser}`,
        };
      }
    }

    // Calculate the discount amount
    const calculatedDiscount = this.calculateDiscount(coupon, applicableTotal);

    return {
      isValid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        couponType: coupon.couponType,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
      },
      calculatedDiscount,
      applicableProductIds,
    };
  }

  /**
   * Calculate the applicable cart total based on product restrictions
   */
  private calculateApplicableCartTotal(
    cart: Cart,
    coupon: Coupon,
  ): { applicableTotal: number; applicableProductIds: string[] | null } {
    // If no product restrictions, return full cart total
    if (
      (!coupon.applicableProductIds || coupon.applicableProductIds.length === 0) &&
      (!coupon.applicableCategories || coupon.applicableCategories.length === 0)
    ) {
      return {
        applicableTotal: cart.totalPriceBeforeDiscount,
        applicableProductIds: null,
      };
    }

    const applicableProductIds: string[] = [];
    let applicableTotal = 0;

    for (const item of cart.items) {
      let isApplicable = false;

      // Check product ID restriction
      if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
        if (coupon.applicableProductIds.includes(item.productId)) {
          isApplicable = true;
        }
      }

      // Check category restriction
      if (coupon.applicableCategories && coupon.applicableCategories.length > 0 && item.product) {
        if (item.product.category && coupon.applicableCategories.includes(item.product.category)) {
          isApplicable = true;
        }
      }

      if (isApplicable) {
        applicableProductIds.push(item.productId);
        applicableTotal += item.lineTotal;
      }
    }

    return { applicableTotal, applicableProductIds };
  }

  /**
   * Calculate the discount amount for a coupon
   */
  calculateDiscount(coupon: Coupon, applicableTotal: number): number {
    let discount: number;

    if (coupon.discountType === DiscountType.FIXED) {
      // Fixed amount discount
      discount = Math.min(Number(coupon.discountValue), applicableTotal);
    } else {
      // Percentage discount
      discount = (applicableTotal * Number(coupon.discountValue)) / 100;

      // Apply maximum discount cap if set
      if (coupon.maxDiscountAmount !== null) {
        discount = Math.min(discount, Number(coupon.maxDiscountAmount));
      }
    }

    // Ensure discount doesn't exceed the applicable total
    discount = Math.min(discount, applicableTotal);

    // Round to 2 decimal places
    return Math.round(discount * 100) / 100;
  }

  /**
   * Get the number of times a user has used a coupon
   */
  async getUserUsageCount(couponId: string, customerId: string): Promise<number> {
    return this.couponUsageRepository.count({
      where: { couponId, customerId },
    });
  }

  /**
   * Find the best auto-applied coupon for a cart
   * Returns the coupon with highest discount among all eligible auto-applied coupons
   */
  async findBestAutoAppliedCoupon(
    cart: Cart,
    customerId: string,
  ): Promise<{ coupon: Coupon; discount: number } | null> {
    const now = new Date();

    // Get all active auto-applied coupons
    const autoAppliedCoupons = await this.couponRepository.find({
      where: {
        isActive: true,
        couponType: CouponType.AUTO_APPLIED,
        startTime: LessThanOrEqual(now),
        expiryTime: MoreThanOrEqual(now),
      },
      order: { priority: 'DESC' },
    });

    if (autoAppliedCoupons.length === 0) {
      return null;
    }

    // Find the best coupon (highest discount)
    let bestCoupon: Coupon | null = null;
    let bestDiscount = 0;

    for (const coupon of autoAppliedCoupons) {
      const validation = await this.validateCouponEntity(coupon, cart, customerId);
      
      if (validation.isValid && validation.calculatedDiscount !== undefined) {
        if (validation.calculatedDiscount > bestDiscount) {
          bestCoupon = coupon;
          bestDiscount = validation.calculatedDiscount;
        } else if (
          validation.calculatedDiscount === bestDiscount &&
          coupon.priority > (bestCoupon?.priority ?? 0)
        ) {
          // Same discount but higher priority
          bestCoupon = coupon;
        }
      }
    }

    if (bestCoupon) {
      return { coupon: bestCoupon, discount: bestDiscount };
    }

    return null;
  }

  /**
   * Record coupon usage with concurrency handling
   * Uses distributed locks to prevent race conditions
   */
  async recordCouponUsage(
    couponId: string,
    customerId: string,
    cartId: string,
    discountApplied: number,
    cartTotal: number,
  ): Promise<CouponUsage | null> {
    // Use distributed lock to handle concurrency
    const result = await this.redisLockService.withCouponUserLock(
      couponId,
      customerId,
      async () => {
        const coupon = await this.findOne(couponId);

        // Re-validate max total uses within the lock
        if (coupon.maxTotalUses !== null && coupon.currentTotalUses >= coupon.maxTotalUses) {
          throw new BadRequestException('Coupon has reached maximum usage limit');
        }

        // Re-validate max uses per user within the lock
        if (coupon.maxUsesPerUser !== null) {
          const userUsageCount = await this.getUserUsageCount(couponId, customerId);
          if (userUsageCount >= coupon.maxUsesPerUser) {
            throw new BadRequestException('You have reached the maximum usage limit for this coupon');
          }
        }

        // Create usage record
        const usage = this.couponUsageRepository.create({
          couponId,
          customerId,
          cartId,
          discountApplied,
          cartTotalAtApplication: cartTotal,
          appliedAt: new Date(),
        });
        await this.couponUsageRepository.save(usage);

        // Increment coupon usage count
        await this.couponRepository.increment({ id: couponId }, 'currentTotalUses', 1);

        return usage;
      },
    );

    if (!result.success) {
      this.logger.warn(
        `Could not record coupon usage for coupon ${couponId}, user ${customerId} - lock not acquired`,
      );
      throw new BadRequestException(
        'Unable to apply coupon at this time. Please try again.',
      );
    }

    return result.result;
  }

  /**
   * Seed sample coupons for testing
   */
  async seedSampleCoupons(): Promise<Coupon[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const sampleCoupons = [
      {
        code: 'SAVE10',
        name: '10% Off',
        description: 'Get 10% off on orders over $50',
        couponType: CouponType.GENERAL,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        maxDiscountAmount: 50,
        startTime: pastDate,
        expiryTime: futureDate,
        minCartItems: 1,
        minCartValue: 50,
        maxTotalUses: 1000,
        maxUsesPerUser: 3,
        priority: 0,
        isActive: true,
      },
      {
        code: 'FLAT20',
        name: '$20 Off',
        description: 'Get $20 off on orders over $100',
        couponType: CouponType.GENERAL,
        discountType: DiscountType.FIXED,
        discountValue: 20,
        startTime: pastDate,
        expiryTime: futureDate,
        minCartItems: 2,
        minCartValue: 100,
        maxTotalUses: 500,
        maxUsesPerUser: 1,
        priority: 0,
        isActive: true,
      },
      {
        code: 'AUTO15',
        name: 'Auto 15% Off',
        description: 'Automatically get 15% off on orders over $75',
        couponType: CouponType.AUTO_APPLIED,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        maxDiscountAmount: 30,
        startTime: pastDate,
        expiryTime: futureDate,
        minCartItems: 1,
        minCartValue: 75,
        priority: 10,
        isActive: true,
      },
      {
        code: 'AUTO5',
        name: 'Auto $5 Off',
        description: 'Automatically get $5 off on any order',
        couponType: CouponType.AUTO_APPLIED,
        discountType: DiscountType.FIXED,
        discountValue: 5,
        startTime: pastDate,
        expiryTime: futureDate,
        minCartItems: 1,
        minCartValue: 0,
        priority: 5,
        isActive: true,
      },
      {
        code: 'EXPIRED10',
        name: 'Expired 10% Off',
        description: 'This coupon has expired',
        couponType: CouponType.GENERAL,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        startTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        expiryTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        minCartValue: 0,
        priority: 0,
        isActive: true,
      },
      {
        code: 'ONEUSE',
        name: 'One Time Use',
        description: 'Can only be used once per customer',
        couponType: CouponType.GENERAL,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 25,
        maxDiscountAmount: 100,
        startTime: pastDate,
        expiryTime: futureDate,
        minCartValue: 0,
        maxUsesPerUser: 1,
        priority: 0,
        isActive: true,
      },
    ];

    const coupons: Coupon[] = [];
    for (const couponData of sampleCoupons) {
      // Check if coupon with same code exists
      const existing = await this.couponRepository.findOne({
        where: { code: couponData.code },
      });

      if (!existing) {
        const coupon = this.couponRepository.create(couponData);
        coupons.push(await this.couponRepository.save(coupon));
      } else {
        coupons.push(existing);
      }
    }

    return coupons;
  }
}

