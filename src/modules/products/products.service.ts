import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async findAll(page: number, limit: number): Promise<{ products: Product[], metaData: { page: number, limit: number, total: number } }> { 
    const [products, total] = await this.productRepository.findAndCount({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      products,
      metaData: {
        page,
        limit,
        total
      },
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    return this.productRepository.find({
      where: { id: In(ids) },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    product.isActive = false;
    await this.productRepository.save(product);
  }

  async hardRemove(id: string): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { category, isActive: true },
    });
  }

  async seedSampleProducts(): Promise<Product[]> {
    const sampleProducts = [
      {
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 99.99,
        sku: 'WH-001',
        category: 'Electronics',
        stock: 100,
        isActive: true,
      },
      {
        name: 'Bluetooth Speaker',
        description: 'Portable bluetooth speaker with 360° sound',
        price: 49.99,
        sku: 'BS-001',
        category: 'Electronics',
        stock: 150,
        isActive: true,
      },
      {
        name: 'USB-C Cable',
        description: 'Fast charging USB-C cable, 2m length',
        price: 15.99,
        sku: 'UC-001',
        category: 'Accessories',
        stock: 500,
        isActive: true,
      },
      {
        name: 'Phone Case',
        description: 'Premium silicone phone case',
        price: 29.99,
        sku: 'PC-001',
        category: 'Accessories',
        stock: 200,
        isActive: true,
      },
      {
        name: 'Laptop Stand',
        description: 'Ergonomic aluminum laptop stand',
        price: 79.99,
        sku: 'LS-001',
        category: 'Office',
        stock: 75,
        isActive: true,
      },
      {
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with Cherry MX switches',
        price: 149.99,
        sku: 'MK-001',
        category: 'Electronics',
        stock: 50,
        isActive: true,
      },
      {
        name: 'Mouse Pad',
        description: 'Large gaming mouse pad with stitched edges',
        price: 19.99,
        sku: 'MP-001',
        category: 'Accessories',
        stock: 300,
        isActive: true,
      },
      {
        name: 'Webcam HD',
        description: '1080p HD webcam with built-in microphone',
        price: 69.99,
        sku: 'WC-001',
        category: 'Electronics',
        stock: 80,
        isActive: true,
      },
    ];

    const products: Product[] = [];
    for (const productData of sampleProducts) {
      const existing = await this.productRepository.findOne({
        where: { sku: productData.sku },
      });

      if (!existing) {
        const product = this.productRepository.create(productData);
        products.push(await this.productRepository.save(product));
      } else {
        products.push(existing);
      }
    }

    return products;
  }
}

