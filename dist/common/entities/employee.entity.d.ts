export declare enum EmployeeRole {
    EMPLOYEE = "EMPLOYEE",
    MANAGER = "MANAGER"
}
export declare class Employee {
    id: string;
    name: string;
    email: string;
    managerId: string | null;
    role: EmployeeRole;
    createdAt: Date;
    updatedAt: Date;
}
