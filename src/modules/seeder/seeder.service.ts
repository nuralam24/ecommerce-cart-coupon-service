import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private readonly productsService: ProductsService,
    private readonly couponsService: CouponsService,
  ) {}

  async onApplicationBootstrap() {
    const autoSeed = process.env.AUTO_SEED !== 'false';
    
    if (!autoSeed) {
      console.log('⏭️  Auto-seed disabled (AUTO_SEED=false)');
      return;
    }

    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    try {
      const { metaData: productMeta } = await this.productsService.findAll(1, 1);
      
      if (productMeta.total === 0) {
        console.log('🌱 Seeding products...');
        const products = await this.productsService.seedSampleProducts();
        console.log(`   ✅ ${products.length} products seeded`);
      }

      const { metaData: couponMeta } = await this.couponsService.findAll(1, 1);
      
      if (couponMeta.total === 0) {
        console.log('🌱 Seeding coupons...');
        const coupons = await this.couponsService.seedSampleCoupons();
        console.log(`   ✅ ${coupons.length} coupons seeded`);
      }

    } catch (error) {
      console.error('❌ Auto-seed failed:', error.message);
    }
  }
}

