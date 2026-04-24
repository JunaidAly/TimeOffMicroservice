import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
export declare class ManagerGuard implements CanActivate {
    private readonly employeeRepo;
    constructor(employeeRepo: Repository<Employee>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
