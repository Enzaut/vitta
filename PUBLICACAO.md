# Publicar o VITTA na internet (Render)

O arquivo `render.yaml`, na raiz do repositório, descreve tudo. Ele cria, no plano grátis da Render:

- **vitta-db**: o banco PostgreSQL;
- **vitta-api-ucb**: a API (o Dockerfile de `backend/`); ao ligar, ela espera o banco ficar pronto, aplica as migrações e carrega as instituições do mapa;
- **vitta-app-ucb**: a versão web do aplicativo (um site gerado pelo Expo).

## Passo a passo

1. Coloque o código no GitHub (este repositório).
2. Crie uma conta em https://render.com (pode entrar com o GitHub) e autorize a Render a ler o repositório.
3. No painel, clique em **New +**, depois **Blueprint**, e escolha o repositório e a branch `main`. Deixe o campo "Blueprint Path" vazio. A Render lê o `render.yaml` e lista os três itens.
4. Clique em **Deploy Blueprint**.
5. Espere os três ficarem **Live** (de 5 a 10 minutos na primeira vez; o banco aparece como **Available**).
6. Confira:
   - `https://vitta-api-ucb.onrender.com/health` deve mostrar `{"status":"ok","banco":"ok"}`;
   - `https://vitta-app-ucb.onrender.com` abre a versão web do aplicativo.

Se o endereço da API no painel for diferente de `https://vitta-api-ucb.onrender.com` (a Render acrescenta letras quando o nome já existe), vá em **vitta-app-ucb**, **Environment**, corrija `EXPO_PUBLIC_API_URL` para o endereço certo e faça **Manual Deploy**.

## Atualizar o que está no ar

Cada envio (`git push`) para a branch `main` refaz o site e a API sozinho, e isso leva uns 5 minutos. Para enviar uma mudança que não mexe no aplicativo, como um texto do README, escreva `[skip render]` na mensagem do commit e a Render não refaz nada.

## Ver o banco de dados da Render

A Render mostra os dados de conexão, mas não tem uma tela para navegar pelas tabelas. Para ver as tabelas, use o Prisma Studio:

1. No painel, abra **vitta-db**, clique em **Connect** e, na aba **External**, copie a **External Database URL**.
2. Na pasta `backend`, rode (cole a sua URL e deixe o `?sslmode=require` no final):

   ```bash
   npx prisma studio --port 5556 --browser none --url "COLE_A_URL_AQUI?sslmode=require"
   ```

3. Abra http://localhost:5556.

Cuidados: essa URL contém a senha do banco, então não a envie a ninguém nem a salve no repositório. E esse é o banco de verdade do site: o que for apagado ou editado no Studio vale na hora para quem usa o app.

## Cuidados do plano grátis

- A API **dorme depois de 15 minutos sem uso** e leva cerca de 1 minuto para acordar. O app mostra "Acordando o servidor" e tenta sozinho. Antes de uma demonstração, abra o endereço `/health` uns 2 minutos antes.
- O banco grátis **expira 30 dias depois de criado** (e é apagado 14 dias depois, se não for atualizado para um plano pago). Para algo mais duradouro, use um banco no Neon (grátis, sem prazo): crie o banco lá e troque o valor de `DATABASE_URL` da API no painel da Render.
- Na versão web, o mapa em si não aparece (a biblioteca de mapas só funciona no celular). A lista de instituições, o raio e a busca funcionam normalmente. O mapa completo está no aplicativo, no Expo Go.
- `INSTITUICOES_DEMO=true` carrega as 7 instituições de demonstração (fictícias, marcadas assim no app) junto com o Hemocentro de Brasília, que é real. Troque para `false` para ficar só com a real.
- `CORS_ORIGENS=*` deixa qualquer site chamar a API pelo navegador. Como o login vai por token no cabeçalho (e não por cookie), isso é seguro, mas dá para trocar pelo endereço do site, se preferir.
