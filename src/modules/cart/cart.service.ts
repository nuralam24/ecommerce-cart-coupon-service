import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem } from './entities';
import {
  AddToCartDto,
  UpdateCartItemDto,
  ApplyCouponDto,
  CartResponseDto,
  CartItemResponseDto,
  CartSummaryDto,
  AppliedCouponResponseDto,
  AutoAppliedCouponInfoDto,
} from './dto';
import { ProductsService } from '../products/products.service';
import { CouponsService } from '../coupons/coupons.service';
import { DiscountType, CouponType } from '@/common/enums';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly productsService: ProductsService,
    private readonly couponsService: CouponsService,
  ) {}

  /**
   * Get or create an active cart for a customer
   */
  async getOrCreateCart(customerId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { customerId, isActive: true },
      relations: ['items', 'items.product', 'appliedCoupon'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        customerId,
        isActive: true,
        items: [],
      });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  /**
   * Get cart by ID
   */
  async getCartById(cartId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items', 'items.product', 'appliedCoupon'],
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID "${cartId}" not found`);
    }

    return cart;
  }

  /**
   * Get active cart for a customer
   */
  async getCart(customerId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId);
    
    // Check for auto-applied coupons if no manual coupon is applied
    if (!cart.appliedCoupon || cart.isCouponAutoApplied) {
      await this.checkAndApplyAutoCoupon(cart, customerId);
      // Reload cart after potential coupon application
      const updatedCart = await this.getCartById(cart.id);
      return this.transformToResponse(updatedCart);
    }

    return this.transformToResponse(cart);
  }

  /**
   * Add an item to the cart
   */
  async addItem(customerId: string, addToCartDto: AddToCartDto): Promise<CartResponseDto> {
    const { productId, quantity = 1 } = addToCartDto;

    // Validate product exists and is active
    const product = await this.productsService.findOne(productId);
    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    // Check stock
    if (product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
    }

    // Get or create cart
    const cart = await this.getOrCreateCart(customerId);

    // Check if item already exists in cart
    let cartItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
      relations: ['product'],
    });

    if (cartItem) {
      // Update quantity
      cartItem.quantity += quantity;
      if (cartItem.quantity > product.stock) {
        throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
      }
      await this.cartItemRepository.save(cartItem);
    } else {
      // Create new cart item
      cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
      });
      await this.cartItemRepository.save(cartItem);
    }

    // After cart modification, check auto-applied coupons
    const updatedCart = await this.getCartById(cart.id);
    await this.revalidateAppliedCoupon(updatedCart, customerId);

    // Get final cart state
    const finalCart = await this.getCartById(cart.id);
    return this.transformToResponse(finalCart);
  }

  /**
   * Update cart item quantity
   */
  async updateItem(
    customerId: string,
    itemId: string,
    updateDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId);

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
      relations: ['product'],
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item not found`);
    }

    // Check stock
    if (cartItem.product.stock < updateDto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${cartItem.product.stock}`,
      );
    }

    cartItem.quantity = updateDto.quantity;
    await this.cartItemRepository.save(cartItem);

    // After cart modification, check auto-applied coupons
    const updatedCart = await this.getCartById(cart.id);
    await this.revalidateAppliedCoupon(updatedCart, customerId);

    // Get final cart state
    const finalCart = await this.getCartById(cart.id);
    return this.transformToResponse(finalCart);
  }

  /**
   * Remove an item from the cart
   */
  async removeItem(customerId: string, itemId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId);

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item not found`);
    }

    await this.cartItemRepository.remove(cartItem);

    // After cart modification, check auto-applied coupons
    const updatedCart = await this.getCartById(cart.id);
    await this.revalidateAppliedCoupon(updatedCart, customerId);

    // Get final cart state
    const finalCart = await this.getCartById(cart.id);
    return this.transformToResponse(finalCart);
  }

  /**
   * Clear the cart
   */
  async clearCart(customerId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId);

    // Remove all items
    await this.cartItemRepository.delete({ cartId: cart.id });

    // Remove applied coupon
    cart.appliedCoupon = null;
    cart.appliedCouponId = null;
    cart.isCouponAutoApplied = false;
    await this.cartRepository.save(cart);

    const updatedCart = await this.getCartById(cart.id);
    return this.transformToResponse(updatedCart);
  }

  /**
   * Apply a coupon to the cart (manual application)
   */
  async applyCoupon(
    customerId: string,
    applyCouponDto: ApplyCouponDto,
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot apply coupon to an empty cart');
    }

    // Validate the coupon
    const validation = await this.couponsService.validateCoupon(
      applyCouponDto.couponCode,
      cart,
      customerId,
    );

    if (!validation.isValid) {
      throw new BadRequestException(validation.errorMessage || 'Invalid coupon');
    }

    // Check if it's an auto-applied coupon being manually applied
    // Allow it but mark it as manually applied
    const coupon = await this.couponsService.findByCode(applyCouponDto.couponCode);
    
    // Apply the coupon
    cart.appliedCouponId = validation.coupon!.id;
    cart.isCouponAutoApplied = false; // Manual application
    await this.cartRepository.save(cart);

    // Record coupon usage with concurrency handling
    await this.couponsService.recordCouponUsage(
      validation.coupon!.id,
      customerId,
      cart.id,
      validation.calculatedDiscount!,
      cart.totalPriceBeforeDiscount,
    );

    const updatedCart = await this.getCartById(cart.id);
    return this.transformToResponse(updatedCart);
  }

  /**
   * Remove applied coupon from cart
   */
  async removeCoupon(customerId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(customerId);

    if (!cart.appliedCouponId) {
      throw new BadRequestException('No coupon applied to this cart');
    }

    cart.appliedCoupon = null;
    cart.appliedCouponId = null;
    cart.isCouponAutoApplied = false;
    await this.cartRepository.save(cart);

    // Check for auto-applied coupons after removing manual coupon
    const updatedCart = await this.getCartById(cart.id);
    await this.checkAndApplyAutoCoupon(updatedCart, customerId);

    const finalCart = await this.getCartById(cart.id);
    return this.transformToResponse(finalCart);
  }

  /**
   * Check and apply the best auto-applied coupon
   */
  private async checkAndApplyAutoCoupon(
    cart: Cart,
    customerId: string,
  ): Promise<AutoAppliedCouponInfoDto> {
    if (cart.items.length === 0) {
      return { wasAutoApplied: false, message: 'Cart is empty' };
    }

    // Don't override manually applied coupons
    if (cart.appliedCouponId && !cart.isCouponAutoApplied) {
      return { wasAutoApplied: false, message: 'Manual coupon already applied' };
    }

    const bestCoupon = await this.couponsService.findBestAutoAppliedCoupon(cart, customerId);

    if (bestCoupon) {
      // Check if we need to update (different coupon or better discount)
      if (
        cart.appliedCouponId !== bestCoupon.coupon.id ||
        !cart.isCouponAutoApplied
      ) {
        cart.appliedCouponId = bestCoupon.coupon.id;
        cart.isCouponAutoApplied = true;
        await this.cartRepository.save(cart);

        this.logger.debug(
          `Auto-applied coupon ${bestCoupon.coupon.code} to cart ${cart.id}`,
        );

        return {
          wasAutoApplied: true,
          coupon: {
            id: bestCoupon.coupon.id,
            code: bestCoupon.coupon.code,
            name: bestCoupon.coupon.name,
            discountType: bestCoupon.coupon.discountType,
            discountValue: Number(bestCoupon.coupon.discountValue),
            isAutoApplied: true,
          },
          message: `Auto-applied coupon "${bestCoupon.coupon.code}" for $${bestCoupon.discount.toFixed(2)} discount`,
        };
      }
    } else if (cart.appliedCouponId && cart.isCouponAutoApplied) {
      // Remove auto-applied coupon if it's no longer valid
      cart.appliedCouponId = null;
      cart.appliedCoupon = null;
      cart.isCouponAutoApplied = false;
      await this.cartRepository.save(cart);

      return {
        wasAutoApplied: false,
        message: 'Previously auto-applied coupon is no longer valid',
      };
    }

    return { wasAutoApplied: false };
  }

  /**
   * Revalidate applied coupon after cart changes
   */
  private async revalidateAppliedCoupon(cart: Cart, customerId: string): Promise<void> {
    if (!cart.appliedCouponId) {
      // No coupon applied, check for auto-applied
      await this.checkAndApplyAutoCoupon(cart, customerId);
      return;
    }

    const coupon = await this.couponsService.findOne(cart.appliedCouponId);
    const validation = await this.couponsService.validateCouponEntity(
      coupon,
      cart,
      customerId,
    );

    if (!validation.isValid) {
      this.logger.debug(
        `Removing invalid coupon ${coupon.code} from cart ${cart.id}: ${validation.errorMessage}`,
      );

      cart.appliedCouponId = null;
      cart.appliedCoupon = null;
      cart.isCouponAutoApplied = false;
      await this.cartRepository.save(cart);

      // Check for auto-applied coupons
      await this.checkAndApplyAutoCoupon(cart, customerId);
    } else if (cart.isCouponAutoApplied) {
      // Check if there's a better auto-applied coupon
      await this.checkAndApplyAutoCoupon(cart, customerId);
    }
  }

  /**
   * Calculate cart totals including discount
   */
  private calculateCartTotals(cart: Cart): {
    totalPriceBeforeDiscount: number;
    discountAmount: number;
    finalPayableAmount: number;
    discountPercentage?: string;
  } {
    const totalPriceBeforeDiscount = cart.totalPriceBeforeDiscount;
    let discountAmount = 0;
    let discountPercentage: string | undefined;

    if (cart.appliedCoupon) {
      const coupon = cart.appliedCoupon;

      // Calculate applicable total for product-restricted coupons
      let applicableTotal = totalPriceBeforeDiscount;
      if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
        applicableTotal = cart.items
          .filter((item) => coupon.applicableProductIds!.includes(item.productId))
          .reduce((sum, item) => sum + item.lineTotal, 0);
      }

      discountAmount = this.couponsService.calculateDiscount(coupon, applicableTotal);

      // Calculate percentage for display
      if (totalPriceBeforeDiscount > 0) {
        const percentage = (discountAmount / totalPriceBeforeDiscount) * 100;
        discountPercentage = `${percentage.toFixed(1)}%`;
      }
    }

    const finalPayableAmount = Math.max(0, totalPriceBeforeDiscount - discountAmount);

    return {
      totalPriceBeforeDiscount: Math.round(totalPriceBeforeDiscount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPayableAmount: Math.round(finalPayableAmount * 100) / 100,
      discountPercentage,
    };
  }

  /**
   * Transform Cart entity to CartResponseDto
   */
  private transformToResponse(cart: Cart): CartResponseDto {
    const totals = this.calculateCartTotals(cart);

    const items: CartItemResponseDto[] = (cart.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name || 'Unknown Product',
      productPrice: Number(item.product?.price || 0),
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    }));

    let appliedCoupon: AppliedCouponResponseDto | null = null;
    if (cart.appliedCoupon) {
      appliedCoupon = {
        id: cart.appliedCoupon.id,
        code: cart.appliedCoupon.code,
        name: cart.appliedCoupon.name,
        discountType: cart.appliedCoupon.discountType,
        discountValue: Number(cart.appliedCoupon.discountValue),
        isAutoApplied: cart.isCouponAutoApplied,
      };
    }

    const summary: CartSummaryDto = {
      totalPriceBeforeDiscount: totals.totalPriceBeforeDiscount,
      discountAmount: totals.discountAmount,
      finalPayableAmount: totals.finalPayableAmount,
      totalItems: cart.totalItems,
      discountPercentage: totals.discountPercentage,
    };

    return {
      id: cart.id,
      customerId: cart.customerId,
      items,
      appliedCoupon,
      summary,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}

