import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { CartItem } from './cart-item.entity';
import { Coupon } from '@/modules/coupons/entities/coupon.entity';

/**
 * Cart entity representing a customer's shopping cart
 */
@Entity('carts')
export class Cart extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'session_id' })
  sessionId: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, {
    cascade: true,
    eager: true,
  })
  items: CartItem[];

  @ManyToOne(() => Coupon, { nullable: true })
  @JoinColumn({ name: 'applied_coupon_id' })
  appliedCoupon: Coupon | null;

  @Column({ type: 'uuid', nullable: true, name: 'applied_coupon_id' })
  appliedCouponId: string | null;

  /**
   * Flag to indicate if the applied coupon was auto-applied
   */
  @Column({ type: 'boolean', default: false, name: 'is_coupon_auto_applied' })
  isCouponAutoApplied: boolean;

  /**
   * Calculate total price before any discount
   */
  get totalPriceBeforeDiscount(): number {
    if (!this.items || this.items.length === 0) {
      return 0;
    }
    return this.items.reduce((total, item) => {
      return total + Number(item.product?.price || 0) * item.quantity;
    }, 0);
  }

  /**
   * Get the total number of items in the cart
   */
  get totalItems(): number {
    if (!this.items || this.items.length === 0) {
      return 0;
    }
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Get unique product IDs in the cart
   */
  get productIds(): string[] {
    if (!this.items || this.items.length === 0) {
      return [];
    }
    return this.items.map((item) => item.productId);
  }
}

