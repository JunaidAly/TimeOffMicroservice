"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const database_seeder_1 = require("./database.seeder");
const typeorm_1 = require("typeorm");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    const dataSource = app.get(typeorm_1.DataSource);
    await (0, database_seeder_1.seedDatabase)(dataSource);
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Time-Off Microservice running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map