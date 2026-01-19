import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class SubscriberDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    board_id: string;
}

export class SubscriberResponseDto {
    id: string;
    name: string;
    email: string;
    board_id: string;
    created_at: Date;
    updated_at: Date;
}

export interface SubscriberDropdownOption {
    name: string;
    item_id: string;
}
