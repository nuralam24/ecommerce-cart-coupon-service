import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { ProductsModule } from '../products/products.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [ProductsModule, CouponsModule],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}

