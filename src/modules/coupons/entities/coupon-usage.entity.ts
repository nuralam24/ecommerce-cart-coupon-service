import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Coupon } from './coupon.entity';

/**
 * CouponUsage entity to track coupon usage per user
 * 
 * Design Decisions:
 * - Tracks each coupon redemption
 * - Stores discount amount applied at time of use
 * - Allows calculation of per-user usage limits
 * - Composite index on coupon_id + customer_id for efficient lookups
 */
@Entity('coupon_usages')
@Index(['couponId', 'customerId'])
export class CouponUsage extends BaseEntity {
  @Column({ type: 'uuid', name: 'coupon_id' })
  couponId: string;

  @Column({ type: 'varchar', length: 255, name: 'customer_id' })
  customerId: string;

  @Column({ type: 'uuid', nullable: true, name: 'cart_id' })
  cartId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'order_id' })
  orderId: string | null;

  /**
   * The actual discount amount that was applied
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'discount_applied',
  })
  discountApplied: number;

  /**
   * Cart total at the time of coupon application
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'cart_total_at_application',
  })
  cartTotalAtApplication: number;

  @ManyToOne(() => Coupon, (coupon) => coupon.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  /**
   * Timestamp when the coupon was applied to cart
   * (different from createdAt which might be order completion time)
   */
  @Column({ type: 'timestamp', name: 'applied_at' })
  appliedAt: Date;
}

