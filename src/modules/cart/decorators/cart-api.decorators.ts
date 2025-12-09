import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CartResponseDto, AddToCartDto, UpdateCartItemDto, ApplyCouponDto } from '../dto';

/**
 * GET /cart/:customerId
 */
export function ApiGetCart() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get cart for a customer',
      description:
        'Returns the active cart for the customer with all items, applied coupons, and calculated totals. Auto-applied coupons are automatically checked and applied.',
    }),
    ApiParam({
      name: 'customerId',
      description: 'Customer identifier',
      example: 'customer-123',
    }),
    ApiResponse({
      status: 200,
      description: 'Cart retrieved successfully',
      type: CartResponseDto,
    }),
  );
}

/**
 * POST /cart/:customerId/items
 */
export function ApiAddItem() {
  return applyDecorators(
    ApiOperation({
      summary: 'Add item to cart',
      description:
        'Adds a product to the cart. If the product already exists, increases the quantity. Auto-applied coupons are re-evaluated after adding.',
    }),
    ApiParam({
      name: 'customerId',
      description: 'Customer identifier',
      example: 'customer-123',
    }),
    ApiBody({ type: AddToCartDto }),
    ApiResponse({
      status: 201,
      description: 'Item added to cart successfully',
      type: CartResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or insufficient stock',
    }),
    ApiResponse({
      status: 404,
      description: 'Product not found',
    }),
  );
}

/**
 * PUT /cart/:customerId/items/:itemId
 */
export function ApiUpdateItem() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update cart item quantity',
      description:
        'Updates the quantity of an item in the cart. Auto-applied coupons are re-evaluated after updating.',
    }),
    ApiParam({
      name: 'customerId',
      description: 'Customer identifier',
      example: 'customer-123',
    }),
    ApiParam({
      name: 'itemId',
      description: 'Cart item UUID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiBody({ type: UpdateCartItemDto }),
    ApiResponse({
      status: 200,
      description: 'Cart item updated successfully',
      type: CartResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or insufficient stock',
    }),
    ApiResponse({
      status: 404,
      description: 'Cart item not found',
    }),
  );
}

/**
 * DELETE /cart/:customerId/items/:itemId
 */
export function ApiRemoveItem() {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove item from cart',
      description:
        'Removes an item from the cart. Auto-applied coupons are re-evaluated after removing.',
    }),
    ApiParam({
      name: 'customerId',
      description: 'Customer identifier',
      example: 'customer-123',
    }),
    ApiParam({
      name: 'itemId',
      description: 'Cart item UUID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiResponse({
      status: 200,
      description: 'Item removed from cart successfully',
      type: CartResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Cart item not found',
    }),
  );
}

/**
 * DELETE /cart/:customerId (clear cart)
 */
export function ApiClearCart() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: 'Clear the cart',
      description: 'Removes all items and applied coupons from the cart.',
    }),
    ApiParam({
      name: 'customerId',
      description: 'Customer identifier',
      example: 'customer-123',
    }),
    ApiResponse({
      status: 200,
      description: 'Cart cleared successfully',
      type: CartResponseDto,
    }),
  );
}

/**
 * POST /cart/:customerId/coupons
 */
export function ApiApplyCoupon() {
  return applyDecorators(
    ApiOperation({
      summary: 'Apply coupon to cart',
      description: `Manually apply a coupon code to the cart. Validates against all coupon rules. Manual coupons take precedence over auto-applied coupons.`,
    }),
    ApiParam({
      name: 'customerId',
      description: 'Customer identifier',
      example: 'customer-123',
    }),
    ApiBody({ type: ApplyCouponDto }),
    ApiResponse({
      status: 201,
      description: 'Coupon applied successfully',
      type: CartResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid coupon or validation failed',
    }),
  );
}

/**
 * DELETE /cart/:customerId/coupons
 */
export function ApiRemoveCoupon() {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove applied coupon',
      description:
        'Removes the currently applied coupon from the cart. Auto-applied coupons will be re-evaluated after removal.',
    }),
    ApiParam({
      name: 'customerId',
      description: 'Customer identifier',
      example: 'customer-123',
    }),
    ApiResponse({
      status: 200,
      description: 'Coupon removed successfully',
      type: CartResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'No coupon applied to cart',
    }),
  );
}
