import { DataSource } from "typeorm";
import { MondayBoard } from "../entities/MondayBoard";
import { MondayItem } from "../entities/MondayItem";

export class SeedMondayBoards {
    public static async run(dataSource: DataSource): Promise<void> {
        const boardRepository = dataSource.getRepository(MondayBoard);
        const itemRepository = dataSource.getRepository(MondayItem);

        // Primeiro apaga os items dependentes
        await itemRepository.query("DELETE FROM monday_items");
        // Depois apaga os boards
        await boardRepository.query("DELETE FROM monday_boards");

        const boards = [
            {
                name: "Área Solicitante",
                board_id: "7400348232",
                description: "Board para controle das áreas solicitantes de campanhas",
                is_active: true,
                query_fields: ["status__1"]
            },
            {
                name: "Canal",
                board_id: "7400353565",
                description: "Board para gerenciamento dos canais de comunicação",
                is_active: true,
                query_fields: ["status__1", "numeric_mktmre00"]
            },
            {
                name: "Hora",
                board_id: "8088143343",
                description: "Board para controle de horários disponíveis",
                is_active: true,
                query_fields: ["status"]
            },
            {
                name: "Mecânica",
                board_id: "7400361115",
                description: "Board para mecânicas de campanhas",
                is_active: true,
                query_fields: ["status__1"]
            },
            {
                name: "Objetivo",
                board_id: "7420083894",
                description: "Board para controle do tipo de objetivo da campanha",
                is_active: true,
                query_fields: ["status__1"]
            },
            {
                name: "Produto",
                board_id: "7400364599",
                description: "Board para produtos disponíveis",
                is_active: true,
                query_fields: ["status__1"]
            },
            {
                name: "Segmento",
                board_id: "7420104356",
                description: "Board para controle do tipo de segmento",
                is_active: true,
                query_fields: ["status__1"]
            },
            {
                name: "Tipo de Campanha",
                board_id: "7400351371",
                description: "Board para tipos de campanhas disponíveis",
                is_active: true,
                query_fields: ["status__1"]
            },
            {
                name: "Tipo de Cliente",
                board_id: "7400357748",
                description: "Board para classificação dos tipos de clientes",
                is_active: true,
                query_fields: ["status__1"]
            },
            {
                name: "Tipo de Disparo",
                board_id: "7420002159",
                description: "Board para controle do tipo de disparo",
                is_active: true,
                query_fields: ["status__1"]
            },
            {
                name: "Subproduto",
                board_id: "18028557230",
                description: "Board para controle de subprodutos",
                is_active: true,
                query_fields: ["status", "text_mkw213jk", "text_mkw2kskm"]
            }
        ];

        for (const boardData of boards) {
            const board = boardRepository.create(boardData);
            await boardRepository.save(board);
            console.log(`✅ Board "${boardData.name}" criado com sucesso`);
        }

        console.log(`🎯 Total de ${boards.length} boards criados`);
    }
}
