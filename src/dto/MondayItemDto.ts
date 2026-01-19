import { IsString, IsOptional } from "class-validator";

export class MondayItemResponseDto {
  id: string;
  item_id: string;
  name: string;
  status: string;
  max_value?: number;
  board_id: string;
  created_at: Date;
  updated_at: Date;
}

export class SyncMondayDataDto {
  @IsString()
  @IsOptional()
  board_name?: string;

  @IsString()
  @IsOptional()
  status_filter?: string = "Ativo";
}

export class SyncBoardResponseDto {
  success: boolean;
  message: string;
  itemsCount: number;
  boardName?: string;
  boardId?: string;
}
