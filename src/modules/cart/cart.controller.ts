import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, ApplyCouponDto, CartResponseDto } from './dto';
import { ApiGetCart, ApiAddItem, ApiUpdateItem, ApiRemoveItem, ApiClearCart, ApiApplyCoupon, ApiRemoveCoupon } from './decorators';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(':customerId')
  @ApiGetCart()
  getCart(@Param('customerId') customerId: string): Promise<CartResponseDto> {
    return this.cartService.getCart(customerId);
  }

  @Post(':customerId/items')
  @ApiAddItem()
  addItem(
    @Param('customerId') customerId: string,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(customerId, addToCartDto);
  }

  @Put(':customerId/items/:itemId')
  @ApiUpdateItem()
  updateItem(
    @Param('customerId') customerId: string,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(customerId, itemId, updateCartItemDto);
  }

  @Delete(':customerId/items/:itemId')
  @ApiRemoveItem()
  removeItem(
    @Param('customerId') customerId: string,
    @Param('itemId') itemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(customerId, itemId);
  }

  @Delete(':customerId')
  @ApiClearCart()
  clearCart(@Param('customerId') customerId: string): Promise<CartResponseDto> {
    return this.cartService.clearCart(customerId);
  }

  @Post(':customerId/coupons')
  @ApiApplyCoupon()
  applyCoupon(
    @Param('customerId') customerId: string,
    @Body() applyCouponDto: ApplyCouponDto,
  ): Promise<CartResponseDto> {
    return this.cartService.applyCoupon(customerId, applyCouponDto);
  }

  @Delete(':customerId/coupons')
  @ApiRemoveCoupon()
  removeCoupon(@Param('customerId') customerId: string): Promise<CartResponseDto> {
    return this.cartService.removeCoupon(customerId);
  }
}
