import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';
import { CreateProductDto, UpdateProductDto } from '../dto';

/**
 * POST /products - Create product
 */
export function ApiCreateProduct() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new product' }),
    ApiBody({ type: CreateProductDto }),
    ApiResponse({
      status: 201,
      description: 'Product created successfully',
      type: Product,
    }),
    ApiResponse({ status: 400, description: 'Invalid input' }),
  );
}

/**
 * GET /products - Get all products
 */
export function ApiGetAllProducts() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all products' }),
    ApiResponse({
      status: 200,
      description: 'List of all active products',
      type: [Product],
    }),
  );
}

/**
 * GET /products/:id - Get product by ID
 */
export function ApiGetProductById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a product by ID' }),
    ApiParam({ name: 'id', description: 'Product UUID' }),
    ApiResponse({
      status: 200,
      description: 'Product found',
      type: Product,
    }),
    ApiResponse({ status: 404, description: 'Product not found' }),
  );
}

/**
 * PATCH /products/:id - Update product
 */
export function ApiUpdateProduct() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a product' }),
    ApiParam({ name: 'id', description: 'Product UUID' }),
    ApiBody({ type: UpdateProductDto }),
    ApiResponse({
      status: 200,
      description: 'Product updated successfully',
      type: Product,
    }),
    ApiResponse({ status: 404, description: 'Product not found' }),
  );
}

/**
 * DELETE /products/:id - Delete product
 */
export function ApiDeleteProduct() {
  return applyDecorators(
    HttpCode(HttpStatus.NO_CONTENT),
    ApiOperation({ summary: 'Delete a product (soft delete)' }),
    ApiParam({ name: 'id', description: 'Product UUID' }),
    ApiResponse({ status: 204, description: 'Product deleted successfully' }),
    ApiResponse({ status: 404, description: 'Product not found' }),
  );
}

/**
 * POST /products/seed - Seed sample products
 */
export function ApiSeedProducts() {
  return applyDecorators(
    ApiOperation({ summary: 'Seed sample products for testing' }),
    ApiResponse({
      status: 201,
      description: 'Sample products created',
      type: [Product],
    }),
  );
}
