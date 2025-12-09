import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { Product } from './entities/product.entity';
import { ApiCreateProduct, ApiGetAllProducts, ApiGetProductById, ApiUpdateProduct, ApiDeleteProduct, ApiSeedProducts } from './decorators';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiCreateProduct()
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiGetAllProducts()
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of items per page', required: false })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, 
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<{ products: Product[], metaData: { page: number, limit: number, total: number } }> {
    return this.productsService.findAll(page, limit);
  }

  @Get(':id')
  @ApiGetProductById()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiUpdateProduct()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiDeleteProduct()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }

  @Post('seed')
  @ApiSeedProducts()
  seedSampleProducts(): Promise<Product[]> {
    return this.productsService.seedSampleProducts();
  }
}
