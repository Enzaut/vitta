# Roteiro para gravar o vídeo da E3-2 (RNF-008) no Expo Go

Entrega 3, item **E3-2** (Geolocalização: precisão e permissões). A matriz pede o teste **manual em aparelho real** com a permissão **concedida**, **negada** (cenário 5 da HU-05) e com o **GPS desligado**, e o vídeo ou os prints dos três casos. Este roteiro leva uns 10 minutos.

O que o app faz em cada caso:

| Caso | O que a pessoa vê |
|---|---|
| Permissão concedida e GPS ligado | Mapa centrado nela, círculo do raio, marcadores das instituições, lista de cards e a precisão do GPS |
| Permissão negada | Mensagem “Para visualizar as instituições próximas, precisamos da sua localização. Ative a permissão nas configurações do dispositivo.” e o campo de busca por nome funcionando |
| GPS desligado | Mensagem “O GPS do aparelho está desligado. Ative a localização para ver as instituições próximas.” e o campo de busca por nome funcionando |

## Antes de começar

1. **Docker Desktop** aberto e o banco no ar (`docker compose up -d db` na pasta do projeto, se ainda não estiver).
2. **API rodando**: `npm run dev` na pasta `backend`. As instituições já estão no banco. Em um banco novo, rode antes `npm run migrate:deploy` e `npm run seed` (o `docker compose up --build` já faz isso sozinho).
3. **App**: `npx expo start -c` na pasta `frontend`. O `-c` limpa o cache, necessário porque entraram bibliotecas novas (mapa e localização). Abra no Expo Go (o projeto usa o Expo SDK 58, o mesmo do Expo Go atual) com o celular na mesma rede do computador, ou use `npx expo start --tunnel`.
4. Entre no app com uma conta (ou crie uma).
5. Fique **dentro do Distrito Federal**: as instituições cadastradas ficam no DF. Fora dele, a lista “perto de mim” aparece vazia (o app avisa “Nenhuma instituição encontrada em até 20 km”) e só a busca por nome mostra as instituições.
6. Ligue a **gravação de tela** do celular (Android: puxe a barra de cima duas vezes e toque em “Gravação de tela”; iPhone: Central de Controle, botão de gravar).

Atenção: no Expo Go, a permissão de localização é do **Expo Go**, não do VITTA. É lá que ela aparece nas configurações do aparelho.

Para repetir o teste do começo, volte a permissão para “Perguntar sempre”:

- **Android:** Configurações, Apps, Expo Go, Permissões, Localização, **Perguntar sempre**.
- **iPhone:** Ajustes, Expo Go, Localização, **Perguntar na Próxima Vez ou ao Compartilhar**.

## Caso 2: permissão negada (grave primeiro)

1. Com a permissão em “Perguntar sempre” e o GPS ligado, toque na aba **Mapa**.
2. O celular mostra o pedido de permissão de localização do Expo Go (no Android, algo como “Permitir que o Expo Go acesse a localização deste dispositivo?”). Toque em **Não permitir**.
3. **Esperado:** o aplicativo mostra o quadro amarelo **“Precisamos da sua localização”** com o texto “Para visualizar as instituições próximas, precisamos da sua localização. Ative a permissão nas configurações do dispositivo.” e os botões **Abrir configurações** e **Permitir localização**. Abaixo, a lista com as 8 instituições em ordem alfabética. O campo de busca continua no topo.
4. Digite **gama** no campo de busca. **Esperado:** “1 resultado para ‘gama’” com o Posto de coleta Gama (demonstração). Toque nele para abrir os detalhes (nome, endereço, horário, tipos em falta) e volte.
5. Apague a busca (botão X do campo).
6. Toque em **Abrir configurações**. No Android, vá em Permissões, Localização, e escolha **Permitir somente durante o uso do app**. No iPhone, toque em Localização e escolha **Ao Usar o App**. Volte para o VITTA.
7. **Esperado:** sem tocar em nada, o app confere a permissão de novo e mostra o mapa (caso 1, abaixo).

## Caso 1: permissão concedida

1. **Esperado:** mapa centrado na sua posição (ponto azul), com um círculo vermelho de 20 km, marcadores vermelhos e, abaixo, a linha “Precisão do GPS: cerca de X m.” e a lista “N instituições em até 20 km”, da mais perto para a mais longe, com a distância em cada card.
2. Toque em **5 km** no alto do mapa. **Esperado:** o círculo diminui e a lista passa a mostrar só as instituições dentro de 5 km. Volte para **20 km**.
3. Mostre que os cards trazem nome, endereço, horário e os tipos em falta com o ícone de exclamação vermelho (por exemplo, “O-” e “A-”). Na Samambaia aparece “Nenhum tipo em falta no momento” e no Hemocentro de Brasília “Estoque não informado pela instituição”.
4. Toque em um **marcador** do mapa. **Esperado:** abre a tela com os detalhes da instituição (endereço, telefone, horário, tipos em falta, botões “Como chegar” e “Ligar”). Volte.
5. Digite **hemocentro** na busca e toque no resultado. **Esperado:** abre o Hemocentro de Brasília e, ao voltar, o mapa está centralizado nele. A busca acha a instituição mesmo fora do raio escolhido.
6. Toque em **Perto de mim**. **Esperado:** o mapa volta para a sua posição.

## Caso 3: GPS desligado

1. Com o app aberto na aba Mapa, **desligue a Localização** (GPS). No Android, puxe a barra de cima e desligue “Localização”. No iPhone, vá em Ajustes, Privacidade e Segurança, Serviços de Localização, e desligue. Volte ao VITTA.
2. **Esperado:** o app percebe sozinho e mostra o quadro **“GPS desligado”** com o texto “O GPS do aparelho está desligado. Ative a localização para ver as instituições próximas.”, os botões **Ativar localização** e **Tentar de novo**, a lista alfabética e o campo de busca funcionando. Digite um nome para mostrar a busca manual.
3. Toque em **Ativar localização**. No Android, aparece o aviso do sistema para ativar a localização do dispositivo; toque em **OK**. No iPhone, o botão abre as configurações do Expo Go e é preciso religar os Serviços de Localização em Ajustes, Privacidade e Segurança.
4. **Esperado:** o mapa volta com as instituições próximas.

Se o sinal estiver ruim (por exemplo, dentro de um prédio), o app mostra “Sem sinal de localização” com o botão **Tentar de novo**. Não é um dos três casos da matriz, mas vale mostrar se acontecer.

## Para fechar o vídeo

- Pare a gravação e salve o arquivo na pasta `documentos/evidencias/iteracao-3/` com o nome `RNF-008_video-expo-go.mp4` (ou salve três prints, um por caso).
- Se quiser, mostre também o **Prisma Studio** (`npx prisma studio` na pasta `backend`, endereço http://localhost:5555), tabela `instituicoes`: nome, endereço, latitude, longitude e tipos em falta de cada instituição.

## Observações para quem for conferir

- As **8 instituições** são 1 real (Hemocentro de Brasília, com endereço, telefone e horário do site da Fundação Hemocentro de Brasília) e 7 de **demonstração**, identificadas como fictícias no nome, no endereço e na etiqueta “DEMONSTRAÇÃO” do app. O estoque das de demonstração é inventado, só para mostrar o alerta de tipos em falta (RN08).
- A distância é em **linha reta** entre a pessoa e a instituição. O app envia a posição arredondada (cerca de 100 m) para a API, então a localização exata não sai do aparelho.
- Os testes automáticos do servidor (raio, ordem, busca, mensagens e login obrigatório) estão em `HU-05_testes-automatizados.txt` e a prova de que eles pegam erros em `HU-05_teste-de-sabotagem.txt`. As respostas da API e as instituições do banco estão em `HU-05_consulta-a-api-e-ao-banco.txt`.
- O botão “Agendar Doação” do cenário 2 da HU-05 entra junto com a HU-04 (agendamento). Por enquanto a tela de detalhes só mostra as informações da instituição.
- O projeto está no **Expo SDK 58** (React Native 0.88). O Expo Go de cada celular só abre projetos do SDK que ele mesmo tem; se o aplicativo do celular mudar de versão de novo, o projeto precisa acompanhar (o Expo avisa “Project is incompatible with this version of Expo Go”).
- No iPhone, se a pessoa deixar a “Localização exata” desligada, o app mostra “Localização aproximada: as distâncias podem variar alguns quilômetros.” no lugar da precisão do GPS (no Android acontece o mesmo ao escolher “Aproximada” no pedido de permissão).
