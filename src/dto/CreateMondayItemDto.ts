import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateMondayItemDto {
  @IsString()
  @IsNotEmpty()
  boardId!: string;

  @IsString()
  @IsNotEmpty()
  itemName!: string;

  @IsOptional()
  @IsObject()
  columnValues?: Record<string, any>;
}

export class UpdateMondayItemDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsObject()
  @IsNotEmpty()
  columnValues!: Record<string, any>;
}

export class CreateItemFromFormDto {
  @IsString()
  @IsNotEmpty()
  boardId!: string;

  @IsString()
  @IsNotEmpty()
  itemName!: string;

  @IsObject()
  @IsNotEmpty()
  formData!: Record<string, any>;
}
