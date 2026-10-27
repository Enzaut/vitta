# Checklist da revisão de código das rotas: RNF-002 (Controle de acesso)

Entrega 2, item **E2-3**. Preparado em 19/10/2026 e atualizado no mesmo dia com as rotas reais do formulário de análise (E2-2 / HU-03).

**Critério de aceitação:** cada doador acessa e altera apenas os próprios dados. A tentativa de acessar dados de outro doador é recusada.

**Como revisar:** a revisão deve ser feita por alguém que **não escreveu** o código (como pede o plano). A coluna "Onde ver" diz em qual arquivo conferir cada item. Marque `[x]` quando conferir e anote qualquer problema na seção 5.

| Revisor | Data da revisão | Resultado |
|---|---|---|
| ______________________ | ___/___/2026 | [ ] aprovado  [ ] aprovado com ajustes  [ ] reprovado |

## 1. Rotas da API e quem pode usar cada uma

| Rota | Exige token JWT | De onde vem o id do doador | Guarda do id (403) | O que devolve ou altera |
|---|---|---|---|---|
| `GET /` | não | n/a | n/a | texto fixo |
| `GET /health` | não | n/a | n/a | estado da API e do banco, sem dados de doadores |
| `POST /auth/cadastro` | não (cria a conta) | n/a | n/a | cria o próprio doador; a resposta não traz hash |
| `POST /auth/login` | não | n/a | n/a | devolve o token do doador do e-mail informado |
| `GET /doadores/:id` | **sim** | token (`req.doadorId`) | **sim** | só o próprio doador |
| `PATCH /doadores/:id` | **sim** | token (`req.doadorId`) | **sim** | só telefone e tipo sanguíneo do próprio doador |
| `DELETE /doadores/:id` | **sim** | token (`req.doadorId`) | **sim** | só a própria conta |
| `GET /doadores/:id/formulario` | **sim** | token (`req.doadorId`) | **sim** | só o formulário de análise do próprio doador (a resposta não traz as respostas dadas) |
| `POST /doadores/:id/formulario` | **sim** | token (`req.doadorId`) | **sim** | só grava o formulário do próprio doador |
| `GET /doadores/:id/formulario/modelo` | **sim** | token (`req.doadorId`) | **sim** | as perguntas do formulário, pelo caminho do próprio doador |
| `/doadores/:id/...` (rotas futuras) | **sim** | token | **sim** | já nascem protegidas |
| `GET /doadores` (listar doadores) | n/a | n/a | n/a | **não existe** (404) |

Nas rotas com `:id`, o valor aceito é `me` ou o id do próprio doador logado. Qualquer outro recebe 403.

## 2. Itens do checklist

| OK | Item | Onde ver |
|---|---|---|
| [ ] | Toda rota que mexe em dados de doador passa por `autenticar` (token válido e doador existente) antes de qualquer outra regra. | `src/routes/doadorRoutes.ts` (`doadorRoutes.use(autenticar)`, a primeira linha de regra) |
| [ ] | O id do doador usado nas consultas e alterações vem **sempre do token** (`req.doadorId`), nunca do caminho, do corpo ou da query. | `src/controllers/DoadorController.ts` (só usa `req.doadorId`) |
| [ ] | As rotas com `/:id` passam por `somenteProprioDoador`, que devolve 403 para qualquer id diferente do doador logado, existindo ou não. | `src/middlewares/somenteProprioDoador.ts` e `src/routes/doadorRoutes.ts` (`use("/:id", ...)`) |
| [ ] | O 403 não revela dados do outro doador nem se o id existe (mesmo corpo para id existente e inexistente). | `src/middlewares/somenteProprioDoador.ts`; teste "id que não existe também recebe 403" |
| [ ] | Não existe rota que liste ou busque vários doadores. | `src/routes/index.ts` e `src/routes/doadorRoutes.ts`; teste "GET /doadores não existe" |
| [ ] | O PATCH só aceita telefone e tipo sanguíneo. Campos como `id`, `nome`, `email`, `senhaHash`, `tentativasFalhas` e `bloqueadoAte` são ignorados. | `src/validators/perfilValidator.ts` (o esquema só tem esses dois campos); teste "os campos protegidos não mudam" |
| [ ] | Nenhuma resposta traz senha, hash nem controle de bloqueio. | `src/services/DoadorService.ts` (`paraResposta`); teste "nenhuma resposta traz senha, hash..." |
| [ ] | O token de uma conta excluída deixa de valer. | `src/middlewares/autenticar.ts` (confere se o doador ainda existe) |
| [ ] | O login não revela se um e-mail tem conta (mesma mensagem e tempo de resposta parecido). | `src/services/AuthService.ts` (`conferirContraHashFalso`) |
| [ ] | A segurança não depende só do guarda do id: se ele for removido, os controllers ainda usam o id do token. | verificado com teste de sabotagem (seção 4) |
| [ ] | Rotas novas com id de doador ficam sob `/doadores/:id/...` (regra para a equipe; o formulário da E2-2 já segue). | `src/routes/doadorRoutes.ts` (comentário no topo e as três rotas do formulário no fim) |
| [ ] | O controller do formulário usa só o id do token (`req.doadorId`) para ler e gravar o formulário. | `src/controllers/FormularioController.ts` |
| [ ] | Os testes automatizados cobrem o cenário da matriz: A com o id de B em perfil, alteração, exclusão e formulário. | `tests/acesso.test.ts` (16 testes) e a seção “RNF-002” de `tests/formulario.test.ts` (rotas reais do formulário) |

## 3. Evidências desta entrega

| Evidência pedida na matriz | Arquivo |
|---|---|
| Coleção exportada com os resultados (erro 403 ou 404) | `RNF-002_colecao-com-resultados-newman.json` (coleção + resultado da execução) e `RNF-002_resultado-newman.txt` (resumo legível) |
| Coleção para rodar de novo no Postman | `backend/postman/vitta-rnf-002.postman_collection.json` |
| Resultado do teste automatizado | `RNF-002_testes-automatizados.txt` |
| Checklist da revisão de código | este arquivo |

Resultado da coleção em 19/10/2026: 17 requisições, 27 verificações, 0 falhas. As tentativas de A sobre B (ver perfil, alterar, excluir, ver o formulário, responder o formulário e baixar as perguntas pelo caminho de B) responderam **403**; sem token respondeu **401**; depois disso a conta e o formulário de B continuaram intactos (mesmo resultado e mesma data de preenchimento).

## 4. Teste de sabotagem (para provar que os testes pegam o erro)

Em 19/10/2026 o guarda `doadorRoutes.use("/:id", somenteProprioDoador)` foi comentado de propósito e os testes de `acesso.test.ts` e `formulario.test.ts` rodaram: **8 testes falharam** (7 em `acesso.test.ts`: as 5 rotas do cenário, o id inexistente e o id em maiúsculas; e 1 em `formulario.test.ts`: A vendo, respondendo e baixando as perguntas no formulário de B). Depois o guarda foi restaurado e os 39 testes dos dois arquivos voltaram a passar.

## 5. Observações e pontos de atenção

- O app usa `/doadores/me`. Aceitar também o próprio id no caminho é só uma conveniência para a regra do 403 poder ser testada com o id do doador B.
- O formulário de análise (HU-03) já existe e a coleção usa as rotas reais dele (passos 4, 9, 10, 11, 13 e 15). Rotas novas com id de doador devem entrar na coleção quando forem criadas.
- Fora do escopo do RNF-002: limite de tentativas por IP nas rotas públicas, cabeçalhos de segurança e HTTPS (vem com a publicação na Render).
- Anotações do revisor:

  ______________________________________________________________________________

  ______________________________________________________________________________
