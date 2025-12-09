import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('E-Commerce Cart & Coupon Service')
  .setVersion('1.0')
  .addTag('Cart', 'Cart management operations')
  .addTag('Coupons', 'Coupon management and validation')
  .addTag('Products', 'Product catalog operations')
  .addTag('Health', 'Health check endpoints')
  .build();

