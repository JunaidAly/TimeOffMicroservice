import { IsString, IsEnum, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';
import { TimeOffType } from '../entities/time-off-request.entity';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsEnum(TimeOffType)
  type: TimeOffType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
