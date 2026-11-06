-- RN-003: a validade do formulário de elegibilidade passou de 30 para 7 dias.
-- Recalcula os formulários que já existem: o último dia de validade é o dia do preenchimento
-- (no horário de Brasília) mais 7 dias. Não muda nenhuma tabela, só os dados.
UPDATE "formularios_elegibilidade"
SET "validoAte" = ((("preenchidoEm" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date + 7);
