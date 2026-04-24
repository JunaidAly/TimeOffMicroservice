import { DataSource } from 'typeorm';
import { Employee, EmployeeRole } from './common/entities/employee.entity';
import { Location } from './common/entities/location.entity';

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);
  const locationRepo = dataSource.getRepository(Location);

  const existingEmployees = await employeeRepo.count();
  if (existingEmployees > 0) return; // Already seeded

  const locations = await locationRepo.save([
    { id: 'loc-nyc', name: 'New York', country: 'US', timezone: 'America/New_York' },
    { id: 'loc-lon', name: 'London', country: 'UK', timezone: 'Europe/London' },
    { id: 'loc-syd', name: 'Sydney', country: 'AU', timezone: 'Australia/Sydney' },
  ]);

  const manager = await employeeRepo.save({
    id: 'mgr-001',
    name: 'Sarah Manager',
    email: 'sarah@examplehr.com',
    role: EmployeeRole.MANAGER,
  });

  await employeeRepo.save([
    { id: 'emp-001', name: 'Alice Employee', email: 'alice@examplehr.com', managerId: manager.id, role: EmployeeRole.EMPLOYEE },
    { id: 'emp-002', name: 'Bob Employee', email: 'bob@examplehr.com', managerId: manager.id, role: EmployeeRole.EMPLOYEE },
    { id: 'emp-003', name: 'Carol Employee', email: 'carol@examplehr.com', managerId: manager.id, role: EmployeeRole.EMPLOYEE },
    { id: 'emp-004', name: 'Dave Employee', email: 'dave@examplehr.com', managerId: manager.id, role: EmployeeRole.EMPLOYEE },
  ]);
}
