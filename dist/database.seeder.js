"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const employee_entity_1 = require("./common/entities/employee.entity");
const location_entity_1 = require("./common/entities/location.entity");
async function seedDatabase(dataSource) {
    const employeeRepo = dataSource.getRepository(employee_entity_1.Employee);
    const locationRepo = dataSource.getRepository(location_entity_1.Location);
    const existingEmployees = await employeeRepo.count();
    if (existingEmployees > 0)
        return;
    const locations = await locationRepo.save([
        { id: 'loc-nyc', name: 'New York', country: 'US', timezone: 'America/New_York' },
        { id: 'loc-lon', name: 'London', country: 'UK', timezone: 'Europe/London' },
        { id: 'loc-syd', name: 'Sydney', country: 'AU', timezone: 'Australia/Sydney' },
    ]);
    const manager = await employeeRepo.save({
        id: 'mgr-001',
        name: 'Sarah Manager',
        email: 'sarah@examplehr.com',
        role: employee_entity_1.EmployeeRole.MANAGER,
    });
    await employeeRepo.save([
        { id: 'emp-001', name: 'Alice Employee', email: 'alice@examplehr.com', managerId: manager.id, role: employee_entity_1.EmployeeRole.EMPLOYEE },
        { id: 'emp-002', name: 'Bob Employee', email: 'bob@examplehr.com', managerId: manager.id, role: employee_entity_1.EmployeeRole.EMPLOYEE },
        { id: 'emp-003', name: 'Carol Employee', email: 'carol@examplehr.com', managerId: manager.id, role: employee_entity_1.EmployeeRole.EMPLOYEE },
        { id: 'emp-004', name: 'Dave Employee', email: 'dave@examplehr.com', managerId: manager.id, role: employee_entity_1.EmployeeRole.EMPLOYEE },
    ]);
}
//# sourceMappingURL=database.seeder.js.map