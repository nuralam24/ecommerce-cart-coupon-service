import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@/common/enums';

export class CartItemResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  productId: string;

  @ApiProperty({ example: 'Wireless Headphones' })
  productName: string;

  @ApiProperty({ example: 99.99 })
  productPrice: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 199.98 })
  lineTotal: number;
}

export class AppliedCouponResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'SAVE10' })
  code: string;

  @ApiProperty({ example: '10% Off' })
  name: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  discountType: DiscountType;

  @ApiProperty({ example: 10 })
  discountValue: number;

  @ApiProperty({ example: true })
  isAutoApplied: boolean;
}

export class CartSummaryDto {
  @ApiProperty({
    description: 'Total price before any discount',
    example: 299.99,
  })
  totalPriceBeforeDiscount: number;

  @ApiProperty({
    description: 'Applied discount amount',
    example: 30.00,
  })
  discountAmount: number;

  @ApiProperty({
    description: 'Final payable amount after discount',
    example: 269.99,
  })
  finalPayableAmount: number;

  @ApiProperty({
    description: 'Total number of items in cart',
    example: 3,
  })
  totalItems: number;

  @ApiPropertyOptional({
    description: 'Discount percentage (for display)',
    example: '10%',
  })
  discountPercentage?: string;
}

export class CartResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'customer-123' })
  customerId: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiPropertyOptional({ type: AppliedCouponResponseDto, nullable: true })
  appliedCoupon: AppliedCouponResponseDto | null;

  @ApiProperty({ type: CartSummaryDto })
  summary: CartSummaryDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class AutoAppliedCouponInfoDto {
  @ApiProperty({ description: 'Whether an auto-applied coupon was found' })
  wasAutoApplied: boolean;

  @ApiPropertyOptional({ type: AppliedCouponResponseDto, nullable: true })
  coupon?: AppliedCouponResponseDto | null;

  @ApiPropertyOptional({ description: 'Message explaining why auto-apply happened or not' })
  message?: string;
}

