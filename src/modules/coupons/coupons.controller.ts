import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';
import { Coupon } from './entities';
import { ApiCreateCoupon, ApiGetAllCoupons, ApiGetActiveCoupons, ApiGetCouponById, ApiGetCouponByCode, ApiUpdateCoupon, ApiDeleteCoupon, ApiSeedCoupons } from './decorators';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiCreateCoupon()
  create(@Body() createCouponDto: CreateCouponDto): Promise<Coupon> {
    return this.couponsService.create(createCouponDto);
  }

  @Get()
  @ApiQuery({ name: 'page', description: 'Page number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', description: 'Number of items per page', required: false, example: 10 })
  @ApiGetAllCoupons()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ coupons: Coupon[]; metaData: { page: number; limit: number; total: number } }> {
    return this.couponsService.findAll(page, limit);
  }

  @Get('active')
  @ApiGetActiveCoupons()
  findActive(): Promise<Coupon[]> {
    return this.couponsService.findActive();
  }

  @Get(':id')
  @ApiGetCouponById()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Coupon> {
    return this.couponsService.findOne(id);
  }

  @Get('code/:code')
  @ApiGetCouponByCode()
  async findByCode(@Param('code') code: string): Promise<Coupon> {
    const coupon = await this.couponsService.findByCode(code);
    if (!coupon) {
      throw new Error(`Coupon with code "${code}" not found`);
    }
    return coupon;
  }

  @Patch(':id')
  @ApiUpdateCoupon()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ): Promise<Coupon> {
    return this.couponsService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @ApiDeleteCoupon()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.couponsService.remove(id);
  }

  @Post('seed')
  @ApiSeedCoupons()
  seedSampleCoupons(): Promise<Coupon[]> {
    return this.couponsService.seedSampleCoupons();
  }
}
