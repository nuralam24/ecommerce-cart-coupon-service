import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType, CouponType } from '@/common/enums';

/**
 * Enum for validation error codes
 */
export enum CouponValidationError {
  COUPON_NOT_FOUND = 'COUPON_NOT_FOUND',
  COUPON_INACTIVE = 'COUPON_INACTIVE',
  COUPON_NOT_STARTED = 'COUPON_NOT_STARTED',
  COUPON_EXPIRED = 'COUPON_EXPIRED',
  MIN_CART_ITEMS_NOT_MET = 'MIN_CART_ITEMS_NOT_MET',
  MIN_CART_VALUE_NOT_MET = 'MIN_CART_VALUE_NOT_MET',
  NO_APPLICABLE_PRODUCTS = 'NO_APPLICABLE_PRODUCTS',
  MAX_TOTAL_USES_REACHED = 'MAX_TOTAL_USES_REACHED',
  MAX_USER_USES_REACHED = 'MAX_USER_USES_REACHED',
  CART_EMPTY = 'CART_EMPTY',
}

export class CouponValidationResultDto {
  @ApiProperty({
    description: 'Whether the coupon is valid for this cart',
    example: true,
  })
  isValid: boolean;

  @ApiPropertyOptional({
    description: 'Error code if validation failed',
    enum: CouponValidationError,
    example: CouponValidationError.MIN_CART_VALUE_NOT_MET,
  })
  errorCode?: CouponValidationError;

  @ApiPropertyOptional({
    description: 'Human-readable error message',
    example: 'Minimum cart value of $50 required for this coupon',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Coupon details if valid',
  })
  coupon?: {
    id: string;
    code: string;
    name: string;
    couponType: CouponType;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountAmount: number | null;
  };

  @ApiPropertyOptional({
    description: 'Calculated discount amount if valid',
    example: 29.99,
  })
  calculatedDiscount?: number;

  @ApiPropertyOptional({
    description: 'Products the discount applies to (null = all products in cart)',
  })
  applicableProductIds?: string[] | null;
}

export class ValidateCouponRequestDto {
  @ApiProperty({
    description: 'Coupon code to validate',
    example: 'SAVE10',
  })
  couponCode: string;

  @ApiProperty({
    description: 'Customer ID',
    example: 'customer-123',
  })
  customerId: string;

  @ApiPropertyOptional({
    description: 'Cart ID (if not provided, uses active cart)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  cartId?: string;
}

export class CouponResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'SAVE10' })
  code: string;

  @ApiProperty({ example: '10% Off' })
  name: string;

  @ApiPropertyOptional({ example: 'Get 10% off on orders over $50' })
  description?: string;

  @ApiProperty({ enum: CouponType })
  couponType: CouponType;

  @ApiProperty({ enum: DiscountType })
  discountType: DiscountType;

  @ApiProperty({ example: 10 })
  discountValue: number;

  @ApiPropertyOptional({ example: 50 })
  maxDiscountAmount?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  startTime: Date;

  @ApiProperty({ example: '2024-12-31T23:59:59.999Z' })
  expiryTime: Date;

  @ApiProperty({ example: 0 })
  minCartItems: number;

  @ApiProperty({ example: 50 })
  minCartValue: number;

  @ApiPropertyOptional({ type: [String] })
  applicableProductIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  applicableCategories?: string[];

  @ApiPropertyOptional({ example: 1000 })
  maxTotalUses?: number;

  @ApiProperty({ example: 150 })
  currentTotalUses: number;

  @ApiPropertyOptional({ example: 1 })
  maxUsesPerUser?: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 0 })
  priority: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

