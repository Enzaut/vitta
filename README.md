# VITTA

Aplicativo de incentivo à doação de sangue (projeto da disciplina de Projeto de Software, UCB). A ideia é facilitar a doação e deixar o hábito mais divertido, com pontos e recompensas para quem doa sempre.

## O que já funciona

| Parte | O que faz |
|---|---|
| Boas-vindas | Carrossel na primeira vez que o app abre: por que doar, a ideia do app e como ele funciona |
| Cadastro e login (HU-01) | Conta com e-mail e senha, login com token (JWT) e bloqueio depois de 5 erros de senha |
| Excluir conta (HU-02) | Apaga a conta e todos os dados |
| Formulário de elegibilidade (HU-03) | Perguntas rápidas sobre saúde; diz se a pessoa já pode doar ou a partir de que dia (Portaria GM/MS 11.685/2026) |
| Mapa com instituições (HU-05) | Instituições de coleta perto da pessoa, raio de busca, busca por nome, detalhes e tipos de sangue em falta (sem o botão de agendar, que vem com a HU-04) |
| Perfil (HU-11) | Telefone e tipo sanguíneo |
| Controle de acesso (RNF-002) | Cada doador só enxerga e altera os próprios dados |
| Localização (RNF-008) | Pede permissão, avisa quando o GPS está desligado e mantém a busca por nome |

Ainda não existem: agendamento (HU-04), histórico, notificações e pontos/recompensas.

## Tecnologias

- **Aplicativo** (`frontend/`): Expo SDK 58, React Native 0.88, TypeScript, React Navigation.
- **API** (`backend/`): Node 22, Express 5, TypeScript, Prisma 7, PostgreSQL 16, Zod, JWT.
- **Infraestrutura**: Docker e Docker Compose; publicação na Render.
- **Testes**: Vitest e Supertest (377 testes automáticos).

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

Testes do servidor: em `backend/`, `npm test`.

## Publicar na internet (Render)

O arquivo `render.yaml` descreve tudo. Ele cria, no plano grátis da Render:

- **vitta-db**: o banco PostgreSQL;
- **vitta-api-ucb**: a API (o Dockerfile de `backend/`); ao ligar, aplica as migrações e carrega as instituições;
- **vitta-app-ucb**: a versão web do aplicativo (um site gerado pelo Expo).

Passo a passo:

1. Coloque o código no GitHub (este repositório).
2. Crie uma conta em https://render.com (pode entrar com o GitHub) e autorize a Render a ler este repositório.
3. No painel, clique em **New +**, depois **Blueprint**, escolha o repositório e a branch `main`, e confirme. A Render lê o `render.yaml` e mostra os três itens. Clique em **Apply** (ou **Deploy Blueprint**).
4. Espere os três ficarem **Live** (de 5 a 10 minutos na primeira vez).
5. Abra `https://vitta-api-ucb.onrender.com/health`. Deve aparecer `{"status":"ok","banco":"ok"}`.
6. Abra `https://vitta-app-ucb.onrender.com`: é a versão web do aplicativo.

Se o endereço da API no painel for diferente de `https://vitta-api-ucb.onrender.com` (a Render acrescenta letras quando o nome já existe), vá em **vitta-app-ucb**, **Environment**, corrija `EXPO_PUBLIC_API_URL` para o endereço certo e faça **Manual Deploy**.

Cuidados do plano grátis:

- A API **dorme depois de 15 minutos sem uso** e leva cerca de 1 minuto para acordar. O app mostra "Acordando o servidor" e tenta sozinho. Antes de uma demonstração, abra o endereço `/health` uns 2 minutos antes.
- O banco grátis **expira 30 dias depois de criado** (e some 14 dias depois, se não for atualizado). Para algo mais duradouro, use um banco no Neon (grátis, sem prazo): crie o banco lá e troque o valor de `DATABASE_URL` da API no painel da Render.
- Na versão web, o mapa em si não aparece (a biblioteca de mapas só funciona no celular); a lista de instituições, o raio e a busca funcionam normalmente. O mapa completo está no aplicativo, no Expo Go.
- `INSTITUICOES_DEMO=true` carrega 7 instituições de demonstração (fictícias, marcadas assim no app) junto com o Hemocentro de Brasília, que é real. Troque para `false` para ficar só com a real.

## Documentação e evidências

- `documentos/DOCX` e `documentos/PDFs`: visão, requisitos, casos de uso, arquitetura e guia de estilo.
- `documentos/pesquisa`: pesquisa sobre os formulários de triagem de doação de sangue.
- `documentos/evidencias/iteracao-2` e `iteracao-3`: relatórios de testes, consultas ao banco e roteiros de gravação das entregas.
