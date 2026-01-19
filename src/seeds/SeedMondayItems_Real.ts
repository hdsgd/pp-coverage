import { DataSource } from "typeorm";
import { MondayBoard } from "../entities/MondayBoard";
import { MondayItem } from "../entities/MondayItem";

export class SeedMondayItemsReal {
    public static async run(dataSource: DataSource): Promise<void> {
        const itemRepository = dataSource.getRepository(MondayItem);
        const boardRepository = dataSource.getRepository(MondayBoard);

        // Limpar dados existentes
        await itemRepository.clear();

        // Buscar referências de boards
        const areaBoard = await boardRepository.findOne({ where: { name: "Área Solicitante" } });
        if (!areaBoard) throw new Error("Board 'Área Solicitante' não encontrado");

        const canalBoard = await boardRepository.findOne({ where: { name: "Canal" } });
        if (!canalBoard) throw new Error("Board 'Canal' não encontrado");

        const horaBoard = await boardRepository.findOne({ where: { name: "Hora" } });
        if (!horaBoard) throw new Error("Board 'Hora' não encontrado");

        const mecanicaBoard = await boardRepository.findOne({ where: { name: "Mecânica" } });
        if (!mecanicaBoard) throw new Error("Board 'Mecânica' não encontrado");

        const objetivoBoard = await boardRepository.findOne({ where: { name: "Objetivo" } });
        if (!objetivoBoard) throw new Error("Board 'Objetivo' não encontrado");

        const produtoBoard = await boardRepository.findOne({ where: { name: "Produto" } });
        if (!produtoBoard) throw new Error("Board 'Produto' não encontrado");

        const segmentoBoard = await boardRepository.findOne({ where: { name: "Segmento" } });
        if (!segmentoBoard) throw new Error("Board 'Segmento' não encontrado");

        const tipoCampanhaBoard = await boardRepository.findOne({ where: { name: "Tipo de Campanha" } });
        if (!tipoCampanhaBoard) throw new Error("Board 'Tipo de Campanha' não encontrado");

        const tipoClienteBoard = await boardRepository.findOne({ where: { name: "Tipo de Cliente" } });
        if (!tipoClienteBoard) throw new Error("Board 'Tipo de Cliente' não encontrado");

        const tipoDisparoBoard = await boardRepository.findOne({ where: { name: "Tipo de Disparo" } });
        if (!tipoDisparoBoard) throw new Error("Board 'Tipo de Disparo' não encontrado");

        // Items do board "Área Solicitante"
        const areaItems = [
            { item_id: "7404440354", name: "CRO", status: "Ativo", board_id: areaBoard.id },
            { item_id: "7404440407", name: "CX", status: "Ativo", board_id: areaBoard.id },
            { item_id: "7404440442", name: "Dados", status: "Ativo", board_id: areaBoard.id },
            { item_id: "7404440463", name: "Growth", status: "Ativo", board_id: areaBoard.id },
            { item_id: "7404440497", name: "Negócios", status: "Ativo", board_id: areaBoard.id },
            { item_id: "7404440511", name: "Produto", status: "Ativo", board_id: areaBoard.id },
            { item_id: "7404440530", name: "Risco", status: "Ativo", board_id: areaBoard.id }
        ];

        // Items do board "Canal"
        const canalItems = [
            { item_id: "7723919870", name: "Multicanal", status: "Ativo", max_value: 1000000.00, board_id: canalBoard.id },
            { item_id: "7698495864", name: "Email", status: "Ativo", max_value: 1000000.00, board_id: canalBoard.id },
            { item_id: "7698495865", name: "SMS", status: "Ativo", max_value: 500000.00, board_id: canalBoard.id },
            { item_id: "7698495866", name: "WhatsApp", status: "Ativo", max_value: 750000.00, board_id: canalBoard.id },
            { item_id: "7698495867", name: "Push Notification", status: "Ativo", max_value: 2000000.00, board_id: canalBoard.id },
            { item_id: "7698495868", name: "Facebook Ads", status: "Inativo", max_value: 100000.00, board_id: canalBoard.id }
        ];

        // Items do board "Hora"
        const horaItems = [
            { item_id: "7698500001", name: "03:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500002", name: "06:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500003", name: "07:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500004", name: "07:30", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500005", name: "08:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500006", name: "08:30", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500007", name: "09:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500008", name: "10:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500009", name: "11:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500010", name: "12:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500011", name: "13:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500012", name: "14:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500013", name: "15:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500014", name: "16:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500015", name: "17:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500016", name: "18:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500017", name: "19:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500018", name: "20:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500019", name: "21:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500020", name: "22:00", status: "Ativo", board_id: horaBoard.id },
            { item_id: "7698500021", name: "23:00", status: "Ativo", board_id: horaBoard.id }
        ];

        // Items do board "Tipo de Cliente"
        const tipoClienteItems = [
            { item_id: "7404620986", name: "PF", status: "Ativo", board_id: tipoClienteBoard.id },
            { item_id: "7404621004", name: "PJ", status: "Ativo", board_id: tipoClienteBoard.id },
            { item_id: "7404621020", name: "Underage", status: "Ativo", board_id: tipoClienteBoard.id }
        ];

        // Items do board "Tipo de Campanha"
        const tipoCampanhaItems = [
            { item_id: "9101957315", name: "Blast", status: "Ativo", board_id: tipoCampanhaBoard.id },
            { item_id: "9101959132", name: "Cobrança", status: "Ativo", board_id: tipoCampanhaBoard.id },
            { item_id: "9101962225", name: "Contextual", status: "Ativo", board_id: tipoCampanhaBoard.id },
            { item_id: "9101965262", name: "Novo Swap-in", status: "Ativo", board_id: tipoCampanhaBoard.id },
            { item_id: "7404520364", name: "Regulatorio", status: "Ativo", board_id: tipoCampanhaBoard.id },
            { item_id: "9101970596", name: "Vendas", status: "Ativo", board_id: tipoCampanhaBoard.id },
            { item_id: "9101973835", name: "Welcome 30d", status: "Ativo", board_id: tipoCampanhaBoard.id }
        ];

        // Items do board "Segmento"
        const segmentoItems = [
            { item_id: "7699230615", name: "Alta Renda", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "7699230662", name: "Alta Renda Investidor", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "7699230638", name: "Alto Valor", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "8261707834", name: "Interno", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "8261708112", name: "Mar Aberto", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "8261657591", name: "Negocios", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "7699230681", name: "Todos os segmentos", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "8261658138", name: "Underage", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "8261662012", name: "Varejo", status: "Ativo", board_id: segmentoBoard.id },
            { item_id: "7699230574", name: "Varejo +", status: "Ativo", board_id: segmentoBoard.id }
        ];

        // Items do board "Tipo de Disparo"
        const tipoDisparoItems = [
            { item_id: "7698560552", name: "Abandono", status: "Ativo", board_id: tipoDisparoBoard.id },
            { item_id: "8261339005", name: "Acao Pontual", status: "Ativo", board_id: tipoDisparoBoard.id },
            { item_id: "7698560505", name: "Regua", status: "Ativo", board_id: tipoDisparoBoard.id }
        ];

        // Items do board "Produto"
        const produtoItems = [
            { item_id: "7698380082", name: "Cash-In", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380105", name: "CDB", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380397", name: "Pix", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380424", name: "Pix com Cartao", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380263", name: "Picpay Card Debito", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380288", name: "Picpay Card Multiplo", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380376", name: "PicPay Mais", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380479", name: "Emprestimo", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380490", name: "Emprestimo Consignado", status: "Ativo", board_id: produtoBoard.id },
            { item_id: "7698380542", name: "Não se Aplica", status: "Ativo", board_id: produtoBoard.id }
        ];

        // Combinar todos os items
        const allItems = [
            ...areaItems,
            ...canalItems,
            ...horaItems,
            ...tipoClienteItems,
            ...tipoCampanhaItems,
            ...segmentoItems,
            ...tipoDisparoItems,
            ...produtoItems
        ];

        // Inserir todos os items de uma vez
        const items = itemRepository.create(allItems);
        await itemRepository.save(items);

        console.log(`🎯 Total de ${allItems.length} items criados`);
    }
}
