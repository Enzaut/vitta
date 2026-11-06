# VITTA

Aplicativo de incentivo à doação de sangue, feito para a disciplina de Projeto de Software (UCB).

A ideia é facilitar a doação e deixar o hábito mais divertido: a pessoa descobre se já pode doar, encontra os hemocentros mais perto e, quanto mais doa, mais pontos e recompensas ganha.

## Experimente

- **Versão web:** https://vitta-app-ucb.onrender.com (abre no navegador do computador ou do celular)
- **API (teste de saúde):** https://vitta-api-ucb.onrender.com/health

<img src="documentos/apresentacao/qr-vitta-site.png" alt="QR code para abrir o VITTA no celular" width="160">

Duas observações:

- O servidor está no plano grátis da Render e dorme depois de 15 minutos sem uso. Na primeira visita ele pode levar cerca de 1 minuto para acordar (o app avisa "Acordando o servidor" e tenta sozinho).
- Na versão web o mapa aparece como um quadro explicativo. O mapa completo está no aplicativo, no Expo Go.

## O que já funciona

| Parte | O que faz |
|---|---|
| Boas-vindas | Carrossel na primeira vez que o app abre: por que doar, a ideia do app e como ele funciona |
| Cadastro e login (HU-01) | Conta com e-mail e senha, login com token (JWT) e bloqueio depois de 5 erros de senha |
| Excluir conta (HU-02) | Apaga a conta e todos os dados |
| Formulário de elegibilidade (HU-03) | Perguntas rápidas sobre saúde (Portaria GM/MS 11.685/2026). A resposta é positiva (passou) ou negativa (não passou). Quem passou fica com o formulário válido por 7 dias e pode agendar; quem não passou espera 3 dias para responder de novo. Antes de cada agendamento, o app confere se a pessoa passou e se o formulário ainda vale |
| Mapa com instituições (HU-05) | Instituições de coleta perto da pessoa, raio de busca, busca por nome, detalhes, tipos de sangue em falta e o botão "Agendar doação" |
| Agendar doação (HU-04) | Aba "Agendar": escolhe a instituição, o dia, o médico e o horário (os livres podem ser escolhidos, os ocupados aparecem apagados), confirma o tipo sanguíneo e agenda. Só agenda quem passou no formulário e ainda está na validade; um agendamento por vez; dá para cancelar. Os médicos e os horários são inventados |
| Perfil (HU-11) | Telefone e tipo sanguíneo |
| Controle de acesso (RNF-002) | Cada doador só enxerga e altera os próprios dados |
| Localização (RNF-008) | Pede permissão, avisa quando o GPS está desligado e mantém a busca por nome |

Ainda não existem: a tela de histórico de agendamentos (a API já lista), notificações e pontos/recompensas.

As instituições do mapa são 1 real (Hemocentro de Brasília) e 7 de demonstração, que são fictícias e aparecem marcadas assim no app.

**Médicos e horários inventados.** Pelo documento de requisitos (RN-005), quem guarda a agenda é a instituição e o VITTA só envia o pedido. Como ainda não há integração com nenhuma instituição, a pasta `backend/src/agenda` faz o papel dela: inventa os médicos (`medicosSimulados.ts`), os dias e turnos de atendimento e os horários, e deixa mais ou menos metade deles ocupada (o resultado é sempre o mesmo para o mesmo horário). Os horários vão de hoje até 13 dias à frente, a cada 30 minutos, e só aparecem os que começam daqui a pelo menos 2 horas. Para ligar uma instituição de verdade, basta trocar esse módulo por uma chamada à API dela.

## Banco de dados

O banco é PostgreSQL e está publicado na Render. A imagem mostra as tabelas vistas pelo Prisma Studio; as contas que aparecem são de teste.

![Tabelas do banco PostgreSQL na Render, vistas pelo Prisma Studio](documentos/evidencias/iteracao-3/banco-render-prisma-studio.png)

- `doadores`: as contas. A senha nunca é guardada, só o hash (bcrypt).
- `formularios_elegibilidade`: o último formulário respondido por cada doador.
- `instituicoes`: as instituições do mapa.
- `agendamentos`: as doações agendadas (instituição, médico, horário, tipo sanguíneo e status Agendado ou Cancelado). Os médicos e os horários livres e ocupados não ficam no banco: vêm da agenda inventada.
- `_prisma_migrations`: o histórico das alterações do banco. As tabelas `pg_stat_*` são da própria Render.

## Tecnologias

- **Aplicativo** (`frontend/`): Expo SDK 58, React Native 0.88, TypeScript, React Navigation.
- **API** (`backend/`): Node 22, Express 5, TypeScript, Prisma 7, PostgreSQL 16, Zod, JWT.
- **Infraestrutura**: Docker e Docker Compose; publicação na Render.
- **Testes**: Vitest e Supertest (497 testes automáticos).

```
vitta/
  backend/      a API (rotas, serviços, banco, testes)
  frontend/     o aplicativo (Expo / React Native)
  documentos/   documentos do projeto, pesquisas e evidências das entregas
  docker-compose.yml   banco de dados (e a API, se quiser rodar tudo em containers)
  render.yaml   receita da publicação na internet
```

## Rodar no seu computador

Precisa de: Docker Desktop, Node 22 (ou mais novo) e o app Expo Go no celular (versão do SDK 58).

1. **Banco de dados.** Na pasta do projeto: `docker compose up -d db`
2. **API.** Em `backend/`:
   - `npm ci`
   - copie `.env.example` para `.env` (o valor padrão já funciona com o banco acima)
   - `npx prisma migrate deploy` e `npm run seed` (cria as tabelas e carrega as instituições do mapa)
   - `npm run dev` (a API fica em http://localhost:3000; teste em http://localhost:3000/health)
3. **Aplicativo.** Em `frontend/`:
   - `npm ci`
   - copie `.env.example` para `.env` e troque o endereço pelo IP do seu computador na rede (ex.: `http://192.168.0.10:3000`)
   - `npx expo start -c` e leia o QR code com o Expo Go (celular e computador na mesma rede, ou use `npx expo start --tunnel`)

Para rodar API e banco juntos em containers: `docker compose up --build` (a API aplica as migrações e carrega as instituições sozinha).

## Testes

Em `backend/`, rode `npm test`. São 497 testes, com banco de dados de verdade, cobrindo cadastro, login, controle de acesso, formulário de elegibilidade (inclusive a espera de 3 dias, a validade de 7 dias e a conferência antes de agendar), mapa, CORS e o agendamento (agenda de horários, reserva, horário ocupado, pedidos ao mesmo tempo, instituição fora do ar e cancelamento).

## Publicação na internet

O site e a API ficam na Render, no plano grátis, descritos pelo arquivo `render.yaml`. O passo a passo, os cuidados do plano grátis e como ver o banco da Render estão em [PUBLICACAO.md](PUBLICACAO.md).

## Documentação e evidências

- `documentos/DOCX` e `documentos/PDFs`: visão, requisitos, casos de uso, arquitetura e guia de estilo.
- `documentos/pesquisa`: pesquisa sobre os formulários de triagem de doação de sangue.
- `documentos/evidencias/iteracao-2` e `iteracao-3`: relatórios de testes, consultas ao banco e roteiros de gravação das entregas.
