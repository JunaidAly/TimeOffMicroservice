import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeRole } from '../entities/employee.entity';

@Injectable()
export class ManagerGuard implements CanActivate {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const managerId = request.headers['x-manager-id'];

    if (!managerId) {
      throw new ForbiddenException('Manager ID header (X-Manager-Id) is required');
    }

    const manager = await this.employeeRepo.findOne({ where: { id: managerId } });

    if (!manager || manager.role !== EmployeeRole.MANAGER) {
      throw new ForbiddenException('Only managers can perform this action');
    }

    request.manager = manager;
    return true;
  }
}
