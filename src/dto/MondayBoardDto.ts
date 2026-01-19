import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsArray } from "class-validator";

export class CreateMondayBoardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  board_id: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  query_fields?: string[] = ['id', 'name', 'status'];
}

export class UpdateMondayBoardDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  board_id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  query_fields?: string[];
}

export class MondayBoardResponseDto {
  id: string;
  name: string;
  board_id: string;
  description?: string;
  is_active: boolean;
  query_fields: string[];
  created_at: Date;
  updated_at: Date;
}
