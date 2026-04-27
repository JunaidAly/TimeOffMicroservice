import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { seedDatabase } from './database.seeder';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-employee-id', 'x-manager-id', 'x-idempotency-key'],
  });

  // Seed reference data on startup
  const dataSource = app.get(DataSource);
  await seedDatabase(dataSource);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Time-Off Microservice running on port ${port}`);
}

bootstrap();
