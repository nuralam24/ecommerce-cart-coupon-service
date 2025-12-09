import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsNumber, IsPositive, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    description: 'Product ID to add to cart',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'Quantity to add',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity?: number = 1;
}

export class AddToCartParamsDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'customer-123',
  })
  @IsString()
  customerId: string;
}

