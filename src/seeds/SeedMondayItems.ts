import { DataSource } from "typeorm";
import { MondayItem } from "../entities/MondayItem";
import { MondayBoard } from "../entities/MondayBoard";

export class SeedMondayItems {
    public static async run(dataSource: DataSource): Promise<void> {
        const itemRepository = dataSource.getRepository(MondayItem);
        const boardRepository = dataSource.getRepository(MondayBoard);

        // Delete existing data
        await itemRepository.query("DELETE FROM monday_items");

        // Get boards for reference
        const canalBoard = await boardRepository.findOne({ where: { name: "Canal" } });
        const horaBoard = await boardRepository.findOne({ where: { name: "Hora" } });
        const tipoClienteBoard = await boardRepository.findOne({ where: { name: "Tipo de Cliente" } });
        const areaSolicitanteBoard = await boardRepository.findOne({ where: { name: "Área Solicitante" } });

        if (!canalBoard || !horaBoard) {
            throw new Error("Boards necessários não encontrados");
        }

        const items = [
            // Canais de Comunicação
            {
                item_id: "7698495864",
                name: "Email",
                status: "Ativo",
                max_value: 1000000.00,
                board_id: canalBoard.id
            },
            {
                item_id: "7698495865",
                name: "SMS",
                status: "Ativo", 
                max_value: 500000.00,
                board_id: canalBoard.id
            },
            {
                item_id: "7698495866",
                name: "WhatsApp",
                status: "Ativo",
                max_value: 750000.00,
                board_id: canalBoard.id
            },
            {
                item_id: "7698495867",
                name: "Push Notification",
                status: "Ativo",
                max_value: 2000000.00,
                board_id: canalBoard.id
            },
            {
                item_id: "7698495868",
                name: "Facebook Ads",
                status: "Inativo",
                max_value: 100000.00,
                board_id: canalBoard.id
            },

            // Horários Disponíveis
            {
                item_id: "7698500001",
                name: "03:00",
                status: "Ativo",
                max_value: undefined,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500002",
                name: "06:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500003",
                name: "07:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500004",
                name: "07:30",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500005",
                name: "08:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500006",
                name: "08:30",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500007",
                name: "09:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500008",
                name: "10:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500009",
                name: "11:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500010",
                name: "12:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500011",
                name: "13:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500012",
                name: "14:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500013",
                name: "15:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500014",
                name: "16:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500015",
                name: "17:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500016",
                name: "18:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500017",
                name: "19:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500018",
                name: "20:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500019",
                name: "21:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500020",
                name: "22:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            },
            {
                item_id: "7698500021",
                name: "23:00",
                status: "Ativo",
                max_value: null,
                board_id: horaBoard.id
            }
        ];

        // Adicionar alguns itens para outros boards se existirem
        if (tipoClienteBoard) {
            items.push(
                {
                    item_id: "7698600001",
                    name: "Premium",
                    status: "Ativo",
                    max_value: null,
                    board_id: tipoClienteBoard.id
                },
                {
                    item_id: "7698600002",
                    name: "Standard", 
                    status: "Ativo",
                    max_value: null,
                    board_id: tipoClienteBoard.id
                },
                {
                    item_id: "7698600003",
                    name: "Basic",
                    status: "Ativo",
                    max_value: null,
                    board_id: tipoClienteBoard.id
                }
            );
        }

        if (areaSolicitanteBoard) {
            items.push(
                {
                    item_id: "7698700001",
                    name: "Marketing",
                    status: "Ativo",
                    max_value: null,
                    board_id: areaSolicitanteBoard.id
                },
                {
                    item_id: "7698700002",
                    name: "Vendas",
                    status: "Ativo",
                    max_value: null,
                    board_id: areaSolicitanteBoard.id
                },
                {
                    item_id: "7698700003",
                    name: "CRM",
                    status: "Ativo",
                    max_value: null,
                    board_id: areaSolicitanteBoard.id
                }
            );
        }

        for (const itemData of items) {
            const item = itemRepository.create({
                ...itemData,
                max_value: itemData.max_value === null ? undefined : itemData.max_value
            } as any);
            await itemRepository.save(item);
        }

        console.log(`🎯 Total de ${items.length} items criados`);
    }
}
