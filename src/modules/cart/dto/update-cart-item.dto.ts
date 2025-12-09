import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsPositive, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'New quantity for the item',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemParamsDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'customer-123',
  })
  customerId: string;

  @ApiProperty({
    description: 'Cart Item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  itemId: string;
}

