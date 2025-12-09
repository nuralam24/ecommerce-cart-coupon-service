import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Cart } from './cart.entity';
import { Product } from '@/modules/products/entities/product.entity';

/**
 * CartItem entity representing an item in a customer's cart
 */
@Entity('cart_items')
@Unique(['cartId', 'productId'])
export class CartItem extends BaseEntity {
  @Column({ type: 'uuid', name: 'cart_id' })
  cartId: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @ManyToOne(() => Product, (product) => product.cartItems, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  /**
   * Calculate line total for this cart item
   */
  get lineTotal(): number {
    return Number(this.product?.price || 0) * this.quantity;
  }
}

