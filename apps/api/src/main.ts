import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Define the API Documentation Config
  const config = new DocumentBuilder()
    .setTitle('AgriDoc AI API')
    .setDescription('The core API for uploading and processing agricultural documents.')
    .setVersion('1.0')
    .addBearerAuth() // Adds the "Authorize" button for JWT tokens
    .build();

  // 2. Create the Document
  const document = SwaggerModule.createDocument(app, config);

  // 3. Setup the Swagger UI at "http://localhost:3000/api"
  SwaggerModule.setup('api', app, document);

 app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

