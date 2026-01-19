export interface ChannelScheduleDto {
    id_canal: string;
    data: string; // DD/MM/YYYY format
    hora: string; // HH:MM format
    qtd: number;
    user_id?: string; // ID do usuário que criou a reserva
    area_solicitante: string; // ID da área solicitante do Monday.com (obrigatório)
    solicitante?: string; // Nome do solicitante/demandante (opcional)
    tipo?: 'reserva' | 'agendamento'; // Tipo do registro (padrão: 'agendamento')
}

export interface CreateChannelScheduleDto extends ChannelScheduleDto {}

export interface UpdateChannelScheduleDto extends Partial<ChannelScheduleDto> {}

export interface ChannelScheduleResponseDto {
    id: string;
    id_canal: string;
    data: string;
    hora: string;
    qtd: number;
    area_solicitante: string;
    solicitante?: string;
    tipo: 'reserva' | 'agendamento';
    created_at: Date;
    updated_at: Date;
}
