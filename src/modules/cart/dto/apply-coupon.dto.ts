import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty({
    description: 'Coupon code to apply',
    example: 'SAVE10',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  couponCode: string;
}

