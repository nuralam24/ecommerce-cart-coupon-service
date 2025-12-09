import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CouponResponseDto, CreateCouponDto, UpdateCouponDto } from '../dto';

/**
 * POST /coupons - Create coupon
 */
export function ApiCreateCoupon() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new coupon' }),
    ApiBody({ type: CreateCouponDto }),
    ApiResponse({
      status: 201,
      description: 'Coupon created successfully',
      type: CouponResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input or duplicate code' }),
  );
}

/**
 * GET /coupons - Get all coupons
 */
export function ApiGetAllCoupons() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all coupons' }),
    ApiResponse({
      status: 200,
      description: 'List of all coupons',
      type: [CouponResponseDto],
    }),
  );
}

/**
 * GET /coupons/active - Get active coupons
 */
export function ApiGetActiveCoupons() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all active coupons' }),
    ApiResponse({
      status: 200,
      description: 'List of active coupons (within valid date range)',
      type: [CouponResponseDto],
    }),
  );
}

/**
 * GET /coupons/:id - Get coupon by ID
 */
export function ApiGetCouponById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a coupon by ID' }),
    ApiParam({ name: 'id', description: 'Coupon UUID' }),
    ApiResponse({
      status: 200,
      description: 'Coupon found',
      type: CouponResponseDto,
    }),
    ApiResponse({ status: 404, description: 'Coupon not found' }),
  );
}

/**
 * GET /coupons/code/:code - Get coupon by code
 */
export function ApiGetCouponByCode() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a coupon by code' }),
    ApiParam({ name: 'code', description: 'Coupon code' }),
    ApiResponse({
      status: 200,
      description: 'Coupon found',
      type: CouponResponseDto,
    }),
    ApiResponse({ status: 404, description: 'Coupon not found' }),
  );
}

/**
 * PATCH /coupons/:id - Update coupon
 */
export function ApiUpdateCoupon() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a coupon' }),
    ApiParam({ name: 'id', description: 'Coupon UUID' }),
    ApiBody({ type: UpdateCouponDto }),
    ApiResponse({
      status: 200,
      description: 'Coupon updated successfully',
      type: CouponResponseDto,
    }),
    ApiResponse({ status: 404, description: 'Coupon not found' }),
  );
}

/**
 * DELETE /coupons/:id - Delete coupon
 */
export function ApiDeleteCoupon() {
  return applyDecorators(
    HttpCode(HttpStatus.NO_CONTENT),
    ApiOperation({ summary: 'Delete a coupon' }),
    ApiParam({ name: 'id', description: 'Coupon UUID' }),
    ApiResponse({ status: 204, description: 'Coupon deleted successfully' }),
    ApiResponse({ status: 404, description: 'Coupon not found' }),
  );
}

/**
 * POST /coupons/seed - Seed sample coupons
 */
export function ApiSeedCoupons() {
  return applyDecorators(
    ApiOperation({ summary: 'Seed sample coupons for testing' }),
    ApiResponse({
      status: 201,
      description: 'Sample coupons created',
      type: [CouponResponseDto],
    }),
  );
}
