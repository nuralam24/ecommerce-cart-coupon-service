import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DiscountType, CouponType } from '@/common/enums';
import { CouponUsage } from './coupon-usage.entity';

/**
 * Coupon entity with comprehensive rules and attributes
 * 
 * Design Decisions:
 * - Supports both general (manual) and auto-applied coupons
 * - Flexible discount types: fixed amount or percentage
 * - Comprehensive rule system for validation
 * - Product-specific restrictions stored as JSON array
 * - Usage tracking for both system-wide and per-user limits
 */
@Entity('coupons')
export class Coupon extends BaseEntity {
  /**
   * Unique coupon code for manual entry
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  /**
   * Human-readable name/description of the coupon
   */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * Detailed description of the coupon
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Type of coupon: GENERAL (manual) or AUTO_APPLIED (automatic)
   */
  @Column({
    type: 'enum',
    enum: CouponType,
    default: CouponType.GENERAL,
    name: 'coupon_type',
  })
  couponType: CouponType;

  /**
   * Type of discount: FIXED or PERCENTAGE
   */
  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.FIXED,
    name: 'discount_type',
  })
  discountType: DiscountType;

  /**
   * Discount value - amount for FIXED, percentage for PERCENTAGE type
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_value' })
  discountValue: number;

  /**
   * Maximum discount amount (caps percentage discounts)
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'max_discount_amount',
  })
  maxDiscountAmount: number | null;

  /**
   * Coupon validity start time
   */
  @Column({ type: 'timestamp', name: 'start_time' })
  startTime: Date;

  /**
   * Coupon validity expiry time
   */
  @Column({ type: 'timestamp', name: 'expiry_time' })
  expiryTime: Date;

  /**
   * Minimum number of items required in cart
   */
  @Column({
    type: 'int',
    default: 0,
    name: 'min_cart_items',
  })
  minCartItems: number;

  /**
   * Minimum total cart value required
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'min_cart_value',
  })
  minCartValue: number;

  /**
   * Product IDs this coupon applies to (null means all products)
   * Stored as JSON array for flexibility
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'applicable_product_ids',
  })
  applicableProductIds: string[] | null;

  /**
   * Category restrictions (coupon only applies to these categories)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'applicable_categories',
  })
  applicableCategories: string[] | null;

  /**
   * Maximum total uses system-wide
   */
  @Column({
    type: 'int',
    nullable: true,
    name: 'max_total_uses',
  })
  maxTotalUses: number | null;

  /**
   * Current total usage count (cached for performance)
   */
  @Column({
    type: 'int',
    default: 0,
    name: 'current_total_uses',
  })
  currentTotalUses: number;

  /**
   * Maximum uses per user
   */
  @Column({
    type: 'int',
    nullable: true,
    name: 'max_uses_per_user',
  })
  maxUsesPerUser: number | null;

  /**
   * Whether the coupon is active
   */
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  /**
   * Priority for auto-applied coupons (higher = more priority)
   * When multiple auto-applied coupons are eligible, the one with highest priority wins
   */
  @Column({
    type: 'int',
    default: 0,
    name: 'priority',
  })
  priority: number;

  /**
   * Usage records for this coupon
   */
  @OneToMany(() => CouponUsage, (usage) => usage.coupon)
  usages: CouponUsage[];

  /**
   * Check if coupon is currently within valid time range
   */
  get isWithinValidTimeRange(): boolean {
    const now = new Date();
    return now >= this.startTime && now <= this.expiryTime;
  }

  /**
   * Check if coupon has available uses
   */
  get hasAvailableTotalUses(): boolean {
    if (this.maxTotalUses === null) {
      return true; // No limit
    }
    return this.currentTotalUses < this.maxTotalUses;
  }

  /**
   * Check if coupon is auto-applied type
   */
  get isAutoApplied(): boolean {
    return this.couponType === CouponType.AUTO_APPLIED;
  }
}

