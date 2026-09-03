import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class SaveWorkspaceDto {
  @IsString()
  @IsIn(['dine_restaurant', 'sweet_shop', 'garment_shop', 'retail_shop', 'department_store', 'trading', 'services'])
  businessType: string;

  @IsArray()
  @IsString({ each: true })
  enabledModules: string[];

  @IsOptional()
  @IsIn(['tutorial', 'manual', 'explore'])
  learnMode?: 'tutorial' | 'manual' | 'explore';
}
