import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDate,
  IsUUID,
  Min,
  MaxLength,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType, CouponType } from '@/common/enums';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Unique coupon code',
    example: 'SAVE10',
  })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Coupon name/title',
    example: '10% Off Your Purchase',
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description',
    example: 'Get 10% off on orders over $50',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of coupon (GENERAL for manual, AUTO_APPLIED for automatic)',
    enum: CouponType,
    example: CouponType.GENERAL,
  })
  @IsEnum(CouponType)
  couponType: CouponType;

  @ApiProperty({
    description: 'Type of discount',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({
    description: 'Discount value (amount for FIXED, percentage for PERCENTAGE)',
    example: 10,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue: number;

  @ApiPropertyOptional({
    description: 'Maximum discount amount (caps percentage discounts)',
    example: 50,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  maxDiscountAmount?: number;

  @ApiProperty({
    description: 'Coupon validity start time',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @ApiProperty({
    description: 'Coupon expiry time',
    example: '2024-12-31T23:59:59.999Z',
  })
  @Type(() => Date)
  @IsDate()
  expiryTime: Date;

  @ApiPropertyOptional({
    description: 'Minimum number of items required in cart',
    example: 2,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minCartItems?: number;

  @ApiPropertyOptional({
    description: 'Minimum cart value required',
    example: 50,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minCartValue?: number;

  @ApiPropertyOptional({
    description: 'Product IDs this coupon applies to (null = all products)',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicableProductIds?: string[];

  @ApiPropertyOptional({
    description: 'Categories this coupon applies to',
    example: ['Electronics', 'Accessories'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @ApiPropertyOptional({
    description: 'Maximum total uses system-wide',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxTotalUses?: number;

  @ApiPropertyOptional({
    description: 'Maximum uses per user',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxUsesPerUser?: number;

  @ApiPropertyOptional({
    description: 'Whether the coupon is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Priority for auto-applied coupons (higher = more priority)',
    example: 10,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;
}

