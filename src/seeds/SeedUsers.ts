import { DataSource } from 'typeorm';
import { User } from '../entities/User';

export class SeedUsers {
    static async run(dataSource: DataSource): Promise<void> {
        const userRepository = dataSource.getRepository(User);

        // Verifica se já existe usuário admin
        const existingAdmin = await userRepository.findOne({
            where: { username: 'admin' }
        });

        if (existingAdmin) {
            console.log('   ⚠️  Usuário admin já existe, pulando seed de usuários...');
            return;
        }

        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminId = process.env.ADMIN_ID;

        if (!adminUsername || !adminPassword || !adminId) {
            console.error('   ❌ ERRO: Variáveis de ambiente obrigatórias não configuradas');
            console.error('   Necessário: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_ID');
            throw new Error('ADMIN_USERNAME, ADMIN_PASSWORD e ADMIN_ID são obrigatórios para criar o usuário admin');
        }

        const adminUser = userRepository.create({
            id: adminId,
            username: adminUsername,
            password: adminPassword,
            role: 'admin',
            is_active: true
        });

        await userRepository.save(adminUser);

        console.log('   ✅ Usuário admin criado com sucesso');
        console.log(`      Username: ${adminUsername}`);
    }
}
