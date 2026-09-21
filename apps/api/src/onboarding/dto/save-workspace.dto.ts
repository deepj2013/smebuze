import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { SIGNUP_BUSINESS_TYPES } from '../../common/tenant-client-types';

export class SaveWorkspaceDto {
  @IsString()
  @IsIn([...SIGNUP_BUSINESS_TYPES])
  businessType: string;

  @IsArray()
  @IsString({ each: true })
  enabledModules: string[];

  @IsOptional()
  @IsIn(['tutorial', 'manual', 'explore'])
  learnMode?: 'tutorial' | 'manual' | 'explore';
}
