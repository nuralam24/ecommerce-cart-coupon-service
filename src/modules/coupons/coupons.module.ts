import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon, CouponUsage } from './entities';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { RedisModule } from '../redis';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coupon, CouponUsage]),
    RedisModule,
  ],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}

