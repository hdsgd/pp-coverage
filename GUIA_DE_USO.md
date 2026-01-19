
# Guia de Uso - Sistema de Formulários e Reservas

  

## 📋 Índice

  

-  [Introdução](#introdução)

-  [Formulário de Campanhas](#formulário-de-campanhas)

-  [Gerenciamento de Campanhas](#gerenciamento-de-campanhas)

-  [Painel Administrativo](#painel-administrativo)

  

---

  

## 🎯 Introdução

  

Este sistema permite criar, gerenciar e reservar campanhas de forma integrada. Existem três áreas principais:

  

1.  **Formulário** (`/form`) - Criar novas campanhas

2.  **Reservas** (`/reservas`) - Listar e gerenciar campanhas criadas

3.  **Admin** (`/admin`) - Reservar horários e canais (requer login)

  

---

  

## 📝 Formulário de Campanhas

  

**Rota:**  `/form`

  

### Criar Nova Campanha

  

O formulário permite criar uma nova campanha preenchendo os campos necessários:

  

- Nome da campanha

- Informações de contato

- Configurações específicas

- Demandas e especificações

  

**Como usar:**

  

1. Acesse `/form`

2. Preencha todos os campos obrigatórios

3. Clique em "Enviar"

4. Aguarde a confirmação de sucesso

  

### Editar Campanha Existente

  

**Rota:**  `/form/:id?action=edit`

  

Para editar uma campanha já criada:

  

1. Acesse a lista de campanhas em `/reservas`

2. Clique no ícone de **Editar** (✏️) na campanha desejada

3. Modifique os campos necessários

4. Salve as alterações

  

### Duplicar Campanha

  

**Rota:**  `/form/:id?action=duplicate`

  

Para criar uma cópia de uma campanha existente:

  

1. Acesse a lista de campanhas em `/reservas`

2. Clique no ícone de **Duplicar** (📋) na campanha desejada

3. O formulário será preenchido com os dados da campanha original

4. Modifique o que for necessário

5. Envie para criar uma nova campanha baseada na anterior

  

---

  

## 🗂️ Gerenciamento de Campanhas

  

**Rota:**  `/reservas`

  

Esta página permite visualizar, filtrar e gerenciar todas as campanhas criadas.

  

### Funcionalidades Disponíveis

  

#### 1. **Listar Todas as Campanhas**

  

Ao acessar `/reservas`, você verá uma lista completa de todas as campanhas criadas.

  

Cada campanha exibe:

- Nome da campanha

- ID único

- Botões de ação (Editar e Duplicar)

  

#### 2. **Buscar por Nome**

  

Use o campo de busca para encontrar campanhas específicas:

  

```

🔍 Digite o nome da campanha...

```

  

A busca é feita em tempo real enquanto você digita.

  

#### 3. **Filtrar por Data**

  

Filtre campanhas por período:

  

-  **Data Inicial:** Define o início do período de busca

-  **Data Final:** Define o fim do período de busca

  

Use ambos os campos para definir um intervalo específico.

  

#### 4. **Limpar Filtros**

  

Clique no botão **"Limpar Filtros"** para remover todos os filtros aplicados e voltar à visualização completa.

  

#### 5. **Paginação**

  

A lista suporta paginação para melhor performance:

  

-  **Anterior:** Navega para a página anterior

-  **Próxima:** Navega para a próxima página

- Contador de página atual

  

#### 6. **Editar Campanha**

  

Clique no ícone de **Editar** (✏️) ao lado da campanha para modificá-la.

  

#### 7. **Duplicar Campanha**

  

Clique no ícone de **Duplicar** (📋) para criar uma cópia da campanha com os mesmos dados.

  

### Exemplos de Uso

  

**Exemplo 1: Buscar campanhas de Dezembro**

```

Data Inicial: 01/12/2025

Data Final: 31/12/2025

```

  

**Exemplo 2: Buscar campanha por nome**

```

🔍 "Black Friday 2025"

```

  

**Exemplo 3: Combinar filtros**

```

🔍 "Promoção"

Data Inicial: 01/12/2025

Data Final: 31/12/2025

```

  

---

  

## 👨‍💼 Painel Administrativo

  

**Rota:**  `/admin` (requer autenticação)

  

O painel administrativo permite **reservar horários e canais** para as campanhas.

  

### Acesso

  

1. Acesse `/login` para fazer autenticação

2. Após o login, você será redirecionado para `/admin`

**Credenciais padrão do administrador:**

- Usuário: `admin`
- Senha: `admin123`

  

### Funcionalidades

  

#### 1. **Nova Reserva**

  

Na aba **"Nova Reserva"**, você pode criar reservas de horários:

  

**Campos necessários:**

  

-  **Demandante:** Nome do solicitante

-  **Área Solicitante:** Departamento ou área responsável

-  **Data:** Data da reserva

-  **Horário:** Hora desejada

-  **Canal:** Canal de comunicação/mídia

-  **Quantidade:** Número de slots ou unidades

  

**Como criar:**

  

1. Selecione a aba "Nova Reserva"

2. Preencha todos os campos obrigatórios

3. Clique em "Criar Reserva"

4. Uma notificação de sucesso será exibida

  

#### 2. **Minhas Reservas**

  

Na aba **"Minhas Reservas"**, você pode:

  

-  **Listar** todas as reservas criadas

-  **Editar** uma reserva existente (clique no ícone de edição)

-  **Excluir** uma reserva (clique no ícone de lixeira)

  

### Gerenciamento de Reservas

  

#### Editar Reserva

  

1. Na aba "Minhas Reservas", clique no ícone de **Editar**

2. Um modal será aberto com os dados atuais

3. Modifique os campos necessários

4. Clique em "Salvar"

  

#### Excluir Reserva

  

1. Na aba "Minhas Reservas", clique no ícone de **Excluir**

2. Confirme a exclusão no modal de confirmação

3. A reserva será removida permanentemente

  

### Notificações

  

O sistema exibe notificações (toasts) para informar o resultado das ações:

  

- ✅ **Sucesso:** Verde - operação concluída

- ❌ **Erro:** Vermelho - algo deu errado

- ℹ️ **Info:** Azul - informação adicional

  

---

  

## 🔄 Fluxo de Trabalho Completo

  

### Cenário 1: Criar e Reservar Campanha

  

1. Acesse `/form` e crie uma nova campanha

2. Acesse `/reservas` para verificar se foi criada

3. Faça login em `/login`

4. Acesse `/admin` e reserve horários/canais para a campanha

  

### Cenário 2: Duplicar e Editar

  

1. Acesse `/reservas`

2. Encontre a campanha que deseja copiar

3. Clique em **Duplicar**

4. Edite os dados conforme necessário

5. Envie para criar a nova campanha

  

### Cenário 3: Filtrar e Editar

  

1. Acesse `/reservas`

2. Use os filtros para encontrar campanhas específicas

3. Clique em **Editar** na campanha desejada

4. Faça as modificações

5. Salve as alterações

  

---

  

## 📱 Navegação entre Páginas

  

-  **Voltar ao Formulário:** Clique no botão "← Voltar ao Formulário" na página `/reservas`

-  **Ir para Reservas:** Acesse diretamente `/reservas` na barra de endereços

-  **Acessar Admin:** Acesse `/admin` (após login)
  

---

  

## ⚙️ Dicas e Boas Práticas

  

1.  **Use filtros combinados** para buscas mais precisas

2.  **Limpe os filtros** antes de fazer uma nova busca

3.  **Duplique campanhas** similares para economizar tempo

4.  **Verifique as notificações** após cada ação