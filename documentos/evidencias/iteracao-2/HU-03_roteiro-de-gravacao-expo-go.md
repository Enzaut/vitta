# Roteiro para gravar o vídeo da E2-2 (HU-03) no Expo Go

Entrega 2, item **E2-2** (formulário de análise para candidato a doação). A matriz pede um vídeo dos resultados **apto**, **inapto** e **inapto temporário** e do cenário dos **campos obrigatórios em branco**. Este roteiro leva uns 10 minutos.

## Antes de começar

1. Banco no ar e API rodando (`npm run dev` na pasta `backend`).
2. App aberto no Expo Go (`npx expo start` na pasta `frontend`, com o celular na mesma rede do computador).
3. Ligue a **gravação de tela** do celular. No Android: puxe a barra de cima duas vezes e toque em “Gravação de tela”. No iPhone: Central de Controle, botão de gravar.
4. Grave um vídeo só, na ordem abaixo. Se errar, corte no editor do próprio celular.
5. Quem **passa** pode tocar em “Responder de novo” quando quiser (o resultado novo substitui o anterior). Quem **não passa** só pode responder de novo depois de **3 dias**, então use uma **conta nova** para cada resultado negativo (cenários 2 e 3 abaixo).

Dica: as datas abaixo são relativas (“3 dias atrás”), então o roteiro vale em qualquer dia.

## Cenário 4: campos obrigatórios em branco (grave primeiro, é rápido)

1. Cadastre uma conta nova. O app deve levar direto ao **Formulário de elegibilidade** e mostrar a mensagem “Bem-vinda(o), ... Para liberar o agendamento de doações, responda ao formulário de elegibilidade.”
2. Toque em **Começar**.
3. No passo 1, toque em **Continuar** sem responder nada.
4. **Esperado:** aparece “Responda todas as perguntas obrigatórias para continuar.” e cada pergunta sem resposta fica com “Esta pergunta é obrigatória.”. O formulário continua aberto.

## Cenário 1: apto

Responda assim, avançando com **Continuar** em cada passo:

| Passo | Respostas |
|---|---|
| 1. Como você está hoje | Sim (estou bem) · gripe: Não · sinais sem explicação: Não |
| 2. Seus dados | peso 70 · sexo: Feminino · já doou: Não |
| 3. Tatuagem e piercing | procedimentos: Nenhum destes · piercing: Não |
| 4. Remédios e vacinas | Nenhum destes · Nenhuma |
| 5. Cirurgias e dentista | Nenhuma destas · Nenhum · transfusão: Não |
| 6. Doenças | Nenhuma destas · infecção sexualmente transmissível: Não |
| 7. Situações de risco | Nenhum destes · Nenhuma destas |
| 8. Viagens e malária | Não |
| 9. Gestação | Nenhuma destas |
| 10. Para terminar | marque a declaração e toque em **Enviar formulário** |

**Esperado:** tela verde “Você passou: pode agendar”, com “Ótimo! Você passou no formulário e pode agendar a sua doação. A decisão final é da triagem no hemocentro.”, o quadro “Você pode agendar até [data de 7 dias depois]. Antes de cada agendamento, o app confere se você passou e se o resultado ainda vale.”, a dica do dia da doação e “Respondido em ... Vale até ...” (7 dias depois). Ao voltar ao início, o cartão mostra “Agendamento liberado”.

## Cenário 2: inapto temporário (tatuagem recente)

Toque em **Responder de novo** e repita as respostas do cenário 1, mudando só o passo 3:

- Procedimentos: marque **Tatuagem**, informe como data o dia de **3 dias atrás** e responda **Sim** para “O local tinha licença da vigilância sanitária...”.

**Esperado:** tela vermelha “Você não passou: ainda não é possível doar” com “No momento você não está apto(a) para realizar doações. Você poderá doar a partir de [data de 4 dias à frente]. Para agendar, responda ao formulário de novo quando essa data chegar (só é possível responder de novo depois de 3 dias).” (tatuagem em local seguro: 7 dias depois). O motivo aparece na lista. Um quadro diz “Você poderá responder ao formulário de novo em [dia e hora de 3 dias depois]” e, nesta tela e no início, o botão **Responder de novo** fica desabilitado (espera de 3 dias, RN-005). O cartão do início mostra a mesma data.

Variação para mostrar o outro prazo: responda **Não sei** na pergunta do local. A data de retorno passa a ser **4 meses** depois da tatuagem.

## Cenário inapto: peso abaixo de 50 kg

Saia da conta e **crie uma conta nova** (a anterior está na espera de 3 dias), repita o cenário 1 e mude só o peso para **49**.

**Esperado:** tela vermelha “Você não passou: doação não indicada” com o motivo “Você precisa ter pelo menos 50 kg para doar...”. O agendamento fica bloqueado e o botão **Responder de novo** fica desabilitado por 3 dias.

## Espera de 3 dias e validade de 7 dias (RN-005 e RN-003)

O tempo não dá para esperar durante a gravação, então mostre assim:

- Nas telas dos cenários 2 e 3, aponte o texto com o dia e a hora em que dá para responder de novo e o botão desabilitado.
- No cenário 1, aponte “Vale até ...” (7 dias depois) e a frase “Antes de cada agendamento, o app confere se você passou e se o resultado ainda vale.”
- No computador, rode `npm test` na pasta `backend`: o arquivo `formulario-espera-e-validade.test.ts` anda o relógio 71 horas, 72 horas, 7 e 8 dias e confere a recusa (erro 429), a validade e a conferência antes de agendar (`GET /doadores/me/agendamento/verificacao`).

## Para fechar o vídeo (opcional)

- Mostre o **Prisma Studio** (`npx prisma studio` na pasta `backend`, endereço http://localhost:5555), tabela `formularios_elegibilidade`: as colunas `preenchidoEm` e `validoAte` mostram a data do preenchimento e a validade (7 dias depois).
- Pare a gravação e salve o arquivo na pasta `documentos/evidencias/iteracao-2/` com o nome `HU-03_video-expo-go.mp4`.

## Observações para quem for conferir

- As datas de retorno e os prazos seguem a Portaria GM/MS nº 11.685/2026. O relatório dos testes de limite (7 dias, 4 meses, 49 e 50 kg, idades) está em `HU-03_testes-automatizados.txt`.
- A consulta ao banco com a data de validade está em `HU-03_consulta-ao-banco.txt`.
- Os arquivos `HU-03_testes-automatizados.txt`, `HU-03_teste-de-sabotagem.txt` e `HU-03_consulta-ao-banco.txt` foram gerados antes das regras de espera de 3 dias e de validade de 7 dias (a validade era de 30 dias). Os números atuais saem de `npm test`.
