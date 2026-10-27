// Ilustrações do carrossel de boas-vindas. Foram desenhadas à mão em SVG, no estilo do VITTA,
// então não dependem de imagens de terceiros (nem de direitos autorais) e ficam nítidas em qualquer tela.
// Para trocar uma ilustração por uma foto ou arte pronta, mude o componente em Ilustracao.tsx.
//
// Todas usam a mesma área (320 x 240). Os "id" dos degradês e recortes têm prefixo próprio:
// na web os ids são globais, e dois desenhos com o mesmo id se atrapalhariam.

const VERMELHO = "#D62828";
const VERMELHO_ESCURO = "#A4161A";
const ROSA = "#FDECEC";
const ROSA_MEDIO = "#FAD4D4";
const TINTA = "#2B2B2B";
const BRANCO = "#FFFFFF";
const AMARELO = "#F6C945";
const AMARELO_ESCURO = "#E0A800";
const VERDE = "#2E8B57";
const VERDE_CLARO = "#E8F5EE";
const AZUL = "#3B82C4";
const AZUL_CLARO = "#E3F0FC";
const CINZA = "#E4E4E4";

const PELE_1 = "#F2C6A0";
const PELE_2 = "#C68B59";
const PELE_3 = "#8D5524";
const PELE_4 = "#FFDBB4";

// ---------------------------------------------------------------- pecinhas reaproveitadas

const CORACAO_D =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

const coracao = (x: number, y: number, escala: number, cor = VERMELHO, opacidade = 1) =>
  `<path transform="translate(${x - 12 * escala} ${y - 12 * escala}) scale(${escala})" d="${CORACAO_D}" fill="${cor}" opacity="${opacidade}"/>`;

const brilho = (x: number, y: number, escala: number, cor = AMARELO) =>
  `<path transform="translate(${x} ${y}) scale(${escala})" d="M0 -10 C1.5 -3 3 -1.5 10 0 C3 1.5 1.5 3 0 10 C-1.5 3 -3 1.5 -10 0 C-3 -1.5 -1.5 -3 0 -10Z" fill="${cor}"/>`;

const mais = (x: number, y: number, escala: number, cor = VERMELHO, opacidade = 1) =>
  `<path transform="translate(${x} ${y}) scale(${escala})" d="M-2.5 -9h5v6.5h6.5v5h-6.5v6.5h-5v-6.5h-6.5v-5h6.5z" fill="${cor}" opacity="${opacidade}"/>`;

const confete = (x: number, y: number, largura: number, altura: number, giro: number, cor: string) =>
  `<rect x="${-largura / 2}" y="${-altura / 2}" width="${largura}" height="${altura}" rx="1.5" transform="translate(${x} ${y}) rotate(${giro})" fill="${cor}"/>`;

const bolinha = (x: number, y: number, r: number, cor: string, opacidade = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${cor}" opacity="${opacidade}"/>`;

// Gotinha de sangue (centrada em x, y; escala 1 = cerca de 18 x 21).
const gotinha = (x: number, y: number, escala: number, cor = VERMELHO) =>
  `<path transform="translate(${x} ${y}) scale(${escala})" d="M0 -12 C0 -12 -9 -1 -9 5 A9 9 0 0 0 9 5 C9 -1 0 -12 0 -12Z" fill="${cor}"/>`;

// Fundo comum: uma mancha rosa suave atrás do desenho.
const fundo = () =>
  `<ellipse cx="160" cy="124" rx="140" ry="108" fill="${ROSA}"/>` + `<circle cx="244" cy="62" r="52" fill="${ROSA_MEDIO}" opacity="0.45"/>` + `<circle cx="70" cy="190" r="38" fill="${ROSA_MEDIO}" opacity="0.4"/>`;

const svg = (conteudo: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">${conteudo}</svg>`;

// Pessoa dentro de um círculo (só o busto), usada nos desenhos de quem recebe sangue e de quem doa.
function pessoa(id: string, cx: number, cy: number, r: number, fundoCor: string, pele: string, cabelo: string, roupa: string, sorriso = true) {
  const cabeca = r * 0.3;
  const cabecaY = cy - r * 0.16;
  return (
    `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fundoCor}"/>` +
    `<g clip-path="url(#${id})">` +
    // ombros
    `<path d="M${cx - r * 0.78} ${cy + r} C${cx - r * 0.78} ${cy + r * 0.28} ${cx - r * 0.34} ${cy + r * 0.16} ${cx} ${cy + r * 0.16} C${cx + r * 0.34} ${cy + r * 0.16} ${cx + r * 0.78} ${cy + r * 0.28} ${cx + r * 0.78} ${cy + r} Z" fill="${roupa}"/>` +
    // pescoço
    `<rect x="${cx - r * 0.1}" y="${cabecaY + cabeca * 0.7}" width="${r * 0.2}" height="${r * 0.26}" fill="${pele}"/>` +
    // cabeça e cabelo
    `<circle cx="${cx}" cy="${cabecaY}" r="${cabeca}" fill="${pele}"/>` +
    `<path d="M${cx - cabeca} ${cabecaY} A${cabeca} ${cabeca} 0 0 1 ${cx + cabeca} ${cabecaY} C${cx + cabeca * 0.5} ${cabecaY - cabeca * 0.45} ${cx - cabeca * 0.5} ${cabecaY - cabeca * 0.45} ${cx - cabeca} ${cabecaY} Z" fill="${cabelo}"/>` +
    // olhos e sorriso
    `<circle cx="${cx - cabeca * 0.38}" cy="${cabecaY + cabeca * 0.12}" r="${r * 0.028}" fill="${TINTA}"/>` +
    `<circle cx="${cx + cabeca * 0.38}" cy="${cabecaY + cabeca * 0.12}" r="${r * 0.028}" fill="${TINTA}"/>` +
    (sorriso
      ? `<path d="M${cx - cabeca * 0.34} ${cabecaY + cabeca * 0.42} Q${cx} ${cabecaY + cabeca * 0.78} ${cx + cabeca * 0.34} ${cabecaY + cabeca * 0.42}" stroke="${TINTA}" stroke-width="${r * 0.04}" stroke-linecap="round" fill="none"/>`
      : "") +
    `</g>`
  );
}

// A gotinha simpática, mascote do app. (0, 0) é a ponta de cima; ocupa 124 de largura por cerca de 160 de altura.
function mascote(id: string, x: number, y: number, escala: number, comemorando = false) {
  const corpo = "M62 0 C62 0 0 74 0 88 A62 62 0 0 0 124 88 C124 74 62 0 62 0 Z";
  const bracos = comemorando
    ? `<path d="M10 104 Q-14 100 -20 66" stroke="#C1121F" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M114 104 Q138 100 144 66" stroke="#C1121F" stroke-width="11" stroke-linecap="round" fill="none"/>`
    : `<path d="M8 112 Q-12 114 -18 132" stroke="#C1121F" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M116 108 Q140 100 146 76" stroke="#C1121F" stroke-width="11" stroke-linecap="round" fill="none"/>`;
  const olhos = comemorando
    ? `<path d="M36 96 Q43 86 50 96" stroke="#2B0A0A" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M74 96 Q81 86 88 96" stroke="#2B0A0A" stroke-width="5" stroke-linecap="round" fill="none"/>`
    : `<circle cx="44" cy="94" r="7" fill="#2B0A0A"/><circle cx="80" cy="94" r="7" fill="#2B0A0A"/><circle cx="46.6" cy="91.4" r="2.6" fill="#fff"/><circle cx="82.6" cy="91.4" r="2.6" fill="#fff"/>`;
  const boca = comemorando
    ? `<path d="M44 108 Q62 138 80 108 Z" fill="#7A0C14"/><ellipse cx="62" cy="123" rx="8" ry="4.5" fill="#F4766E"/>`
    : `<path d="M46 110 Q62 126 78 110" stroke="#2B0A0A" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  return (
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5625A"/><stop offset="1" stop-color="#C1121F"/></linearGradient></defs>` +
    `<g transform="translate(${x} ${y}) scale(${escala})">` +
    `<ellipse cx="62" cy="156" rx="46" ry="7" fill="#000" opacity="0.09"/>` +
    bracos +
    `<ellipse cx="42" cy="150" rx="13" ry="7" fill="#8E0F19"/><ellipse cx="82" cy="150" rx="13" ry="7" fill="#8E0F19"/>` +
    `<path d="${corpo}" fill="url(#${id})"/>` +
    `<path d="M20 98 C20 82 30 64 42 50" stroke="#fff" stroke-opacity="0.55" stroke-width="8" stroke-linecap="round" fill="none"/>` +
    olhos +
    `<ellipse cx="29" cy="112" rx="8.5" ry="5.5" fill="#FF8A8A" opacity="0.75"/><ellipse cx="95" cy="112" rx="8.5" ry="5.5" fill="#FF8A8A" opacity="0.75"/>` +
    boca +
    `</g>`
  );
}

// Bolsa de sangue. (0, 0) é o canto de cima à esquerda; escala 1 = 64 de largura por 106 de altura (com o tubinho).
function bolsa(id: string, x: number, y: number, escala: number) {
  return (
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E5383B"/><stop offset="1" stop-color="#B71C1C"/></linearGradient></defs>` +
    `<g transform="translate(${x} ${y}) scale(${escala})">` +
    `<path d="M32 78 V94 Q32 102 40 102 H52" stroke="${VERMELHO_ESCURO}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<rect x="19" y="0" width="26" height="22" rx="6" fill="${VERMELHO_ESCURO}"/>` +
    `<rect x="27" y="6" width="10" height="6" rx="3" fill="${ROSA}"/>` +
    `<rect x="0" y="16" width="64" height="66" rx="14" fill="url(#${id})"/>` +
    `<rect x="6" y="24" width="6" height="50" rx="3" fill="#fff" opacity="0.25"/>` +
    `<rect x="14" y="30" width="42" height="40" rx="9" fill="#fff" opacity="0.96"/>` +
    gotinha(35, 52, 1.05) +
    `</g>`
  );
}

// ---------------------------------------------------------------- as seis ilustrações

// 1. Apresentação: o mascote acenando, com coraçõezinhos e brilhos.
const boasVindas = svg(
  fundo() +
    brilho(60, 62, 1.1) +
    brilho(268, 150, 0.9) +
    brilho(250, 40, 0.7, BRANCO) +
    confete(40, 140, 12, 5, -25, AZUL) +
    confete(282, 94, 12, 5, 30, VERDE) +
    confete(78, 34, 10, 5, 40, AMARELO_ESCURO) +
    coracao(256, 98, 1.3) +
    coracao(54, 104, 0.9, "#F25C54", 0.9) +
    mais(272, 196, 0.8, VERMELHO, 0.8) +
    mascote("ilu-boasvindas-gota", 98, 34, 1.08),
);

// 2. Uma doação, quatro vidas: uma bolsa que se divide em quatro pessoas.
const quatroVidas = svg(
  fundo() +
    `<path d="M160 118 V142 M70 142 H250 M70 142 V158 M130 142 V158 M190 142 V158 M250 142 V158" stroke="${VERMELHO}" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7" fill="none"/>` +
    bolsa("ilu-quatrovidas-bolsa", 128, 8, 1) +
    pessoa("ilu-quatrovidas-p1", 70, 188, 28, "#FFE8D6", PELE_1, "#5A3825", "#3B82C4") +
    pessoa("ilu-quatrovidas-p2", 130, 188, 28, AZUL_CLARO, PELE_3, "#1F1A17", "#F6C945") +
    pessoa("ilu-quatrovidas-p3", 190, 188, 28, VERDE_CLARO, PELE_4, "#B5651D", "#D62828") +
    pessoa("ilu-quatrovidas-p4", 250, 188, 28, "#FFF3C4", PELE_2, "#2B1B12", "#2E8B57") +
    coracao(92, 164, 0.62) +
    coracao(152, 164, 0.62) +
    coracao(212, 164, 0.62) +
    coracao(272, 164, 0.62) +
    brilho(40, 60, 0.9) +
    brilho(284, 70, 0.8) +
    mais(256, 30, 0.7, VERMELHO, 0.7),
);

// 3. Sangue não se fabrica e dura pouco: a bolsa ao lado de uma ampulheta com areia vermelha.
const naoSeFabrica = svg(
  fundo() +
    bolsa("ilu-naofabrica-bolsa", 56, 50, 1.35) +
    // ampulheta
    `<rect x="186" y="40" width="68" height="10" rx="5" fill="${VERMELHO_ESCURO}"/>` +
    `<rect x="186" y="192" width="68" height="10" rx="5" fill="${VERMELHO_ESCURO}"/>` +
    `<path d="M196 50 H244 C244 86 220 100 220 121 C220 142 244 156 244 192 H196 C196 156 220 142 220 121 C220 100 196 86 196 50 Z" fill="#fff" fill-opacity="0.9" stroke="${VERMELHO_ESCURO}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M204 56 H236 C235 76 226 88 220 98 C214 88 205 76 204 56 Z" fill="${VERMELHO}"/>` +
    `<path d="M201 188 C205 168 213 158 220 158 C227 158 235 168 239 188 Z" fill="${VERMELHO}"/>` +
    `<path d="M220 100 V158" stroke="${VERMELHO}" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 5"/>` +
    gotinha(160, 178, 0.8, "#F25C54") +
    gotinha(158, 150, 0.55, "#F25C54") +
    brilho(48, 40, 0.9) +
    mais(280, 120, 0.8, VERMELHO, 0.7) +
    confete(272, 46, 12, 5, 35, AZUL) +
    confete(40, 206, 12, 5, -30, VERDE),
);

// 4. Vantagens para quem doa: uma lista de cartões com ícones.
const vantagens = svg(
  fundo() +
    // cartão 1: coração batendo (triagem)
    `<rect x="52" y="44" width="216" height="52" rx="14" fill="#000" opacity="0.06" transform="translate(0 4)"/>` +
    `<rect x="52" y="44" width="216" height="52" rx="14" fill="${BRANCO}"/>` +
    bolinha(82, 70, 17, ROSA) +
    `<path d="M70 70 H77 L80 62 L85 79 L88 70 H94" stroke="${VERMELHO}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<rect x="110" y="58" width="104" height="9" rx="4.5" fill="${CINZA}"/><rect x="110" y="74" width="72" height="8" rx="4" fill="#F0F0F0"/>` +
    bolinha(244, 70, 11, VERDE) +
    `<path d="M238.5 70.5 L242.5 74.5 L250 66.5" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    // cartão 2: escudo (exames)
    `<rect x="52" y="108" width="216" height="52" rx="14" fill="#000" opacity="0.06" transform="translate(0 4)"/>` +
    `<rect x="52" y="108" width="216" height="52" rx="14" fill="${BRANCO}"/>` +
    bolinha(82, 134, 17, VERDE_CLARO) +
    `<path d="M82 123 L92 127 V135 C92 141 87 145 82 147 C77 145 72 141 72 135 V127 Z" fill="${VERDE}"/>` +
    `<path d="M77.5 135 L81 138.5 L87 131.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<rect x="110" y="122" width="96" height="9" rx="4.5" fill="${CINZA}"/><rect x="110" y="138" width="80" height="8" rx="4" fill="#F0F0F0"/>` +
    bolinha(244, 134, 11, VERDE) +
    `<path d="M238.5 134.5 L242.5 138.5 L250 130.5" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    // cartão 3: calendário (folga)
    `<rect x="52" y="172" width="216" height="52" rx="14" fill="#000" opacity="0.06" transform="translate(0 4)"/>` +
    `<rect x="52" y="172" width="216" height="52" rx="14" fill="${BRANCO}"/>` +
    bolinha(82, 198, 17, AZUL_CLARO) +
    `<rect x="71" y="188" width="22" height="20" rx="4" fill="${AZUL}"/><rect x="71" y="188" width="22" height="6" rx="3" fill="#2A67A0"/>` +
    `<rect x="76" y="184" width="3" height="7" rx="1.5" fill="#2A67A0"/><rect x="85" y="184" width="3" height="7" rx="1.5" fill="#2A67A0"/>` +
    `<rect x="75" y="198" width="5" height="4" rx="1" fill="#fff"/><rect x="84" y="198" width="5" height="4" rx="1" fill="#fff"/>` +
    `<rect x="110" y="186" width="108" height="9" rx="4.5" fill="${CINZA}"/><rect x="110" y="202" width="64" height="8" rx="4" fill="#F0F0F0"/>` +
    bolinha(244, 198, 11, VERDE) +
    `<path d="M238.5 198.5 L242.5 202.5 L250 194.5" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    brilho(34, 90, 1) +
    brilho(292, 150, 0.8) +
    coracao(288, 52, 0.9) +
    confete(30, 196, 12, 5, 30, AMARELO_ESCURO),
);

// 5. Como funciona: o celular com o mapa e os passos em volta.
const comoFunciona = svg(
  fundo() +
    // linhas pontilhadas ligando os passos ao celular
    `<path d="M88 92 C102 92 104 100 116 104 M232 74 C220 74 214 84 204 92 M230 160 C220 160 214 150 204 142" stroke="${VERMELHO}" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7" fill="none"/>` +
    // celular
    `<rect x="112" y="18" width="96" height="204" rx="20" fill="${TINTA}"/>` +
    `<rect x="118" y="30" width="84" height="180" rx="12" fill="#EAF3EC"/>` +
    `<rect x="148" y="22" width="24" height="5" rx="2.5" fill="#555"/>` +
    // mapa na tela
    `<path d="M118 84 H202" stroke="#fff" stroke-width="9"/><path d="M150 30 V210" stroke="#fff" stroke-width="9"/><path d="M118 150 L202 118" stroke="#fff" stroke-width="7"/>` +
    `<rect x="160" y="40" width="34" height="30" rx="6" fill="#CFE7D3"/><rect x="124" y="94" width="20" height="40" rx="5" fill="${AZUL_CLARO}"/>` +
    `<path d="M168 168 C175 168 180 172 190 170 L202 170 V204 H168 Z" fill="${AZUL_CLARO}"/>` +
    // alfinete
    `<path d="M176 132 C162 116 158 108 158 99 A18 18 0 0 1 194 99 C194 108 190 116 176 132 Z" fill="${VERMELHO}"/>` +
    bolinha(176, 99, 7, BRANCO) +
    // cartão de baixo na tela
    `<rect x="124" y="176" width="72" height="28" rx="8" fill="#fff"/><rect x="132" y="184" width="40" height="6" rx="3" fill="${CINZA}"/><rect x="132" y="194" width="26" height="5" rx="2.5" fill="#F0F0F0"/>` +
    gotinha(184, 190, 0.62) +
    // balão 1: questionário
    bolinha(66, 92, 28, BRANCO) +
    `<rect x="54" y="78" width="24" height="29" rx="5" fill="${AZUL_CLARO}" stroke="${AZUL}" stroke-width="2.4"/>` +
    `<rect x="60" y="74" width="12" height="7" rx="3" fill="${AZUL}"/>` +
    `<path d="M59.5 90.5 L63 94 L70 86.5" stroke="${VERDE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<rect x="59" y="98" width="14" height="3" rx="1.5" fill="${CINZA}"/>` +
    // balão 2: agenda
    bolinha(256, 70, 26, BRANCO) +
    `<rect x="244" y="60" width="24" height="22" rx="5" fill="${AZUL}"/><rect x="244" y="60" width="24" height="7" rx="3.5" fill="#2A67A0"/>` +
    `<rect x="249" y="55" width="3" height="8" rx="1.5" fill="#2A67A0"/><rect x="260" y="55" width="3" height="8" rx="1.5" fill="#2A67A0"/>` +
    `<rect x="248" y="71" width="6" height="5" rx="1" fill="#fff"/><rect x="258" y="71" width="6" height="5" rx="1" fill="#fff"/>` +
    // balão 3: prêmio
    bolinha(254, 164, 26, BRANCO) +
    `<path d="M247 144 L254 158 L261 144" fill="${VERMELHO}"/>` +
    bolinha(254, 166, 12, AMARELO) +
    bolinha(254, 166, 7.5, AMARELO_ESCURO) +
    brilho(254, 166, 0.55, BRANCO) +
    brilho(36, 170, 0.9) +
    mais(290, 108, 0.7, VERMELHO, 0.7),
);

// 6. Bora começar: o mascote comemorando, de medalha no peito, com confete.
const comecar = svg(
  fundo() +
    confete(60, 56, 14, 6, 30, AMARELO) +
    confete(96, 28, 10, 5, -35, AZUL) +
    confete(262, 46, 14, 6, -20, VERDE) +
    confete(228, 24, 10, 5, 50, VERMELHO) +
    confete(40, 130, 12, 5, 10, VERDE) +
    confete(286, 128, 12, 5, 40, AZUL) +
    confete(52, 206, 12, 5, -30, AMARELO_ESCURO) +
    confete(280, 200, 14, 6, 25, AMARELO) +
    brilho(90, 80, 1.1) +
    brilho(236, 84, 1) +
    brilho(268, 176, 0.8, BRANCO) +
    coracao(48, 170, 1) +
    coracao(274, 60, 0.8, "#F25C54") +
    mascote("ilu-comecar-gota", 98, 42, 1.04, true) +
    // medalha na barriguinha, abaixo da boca
    bolinha(160, 187, 12.5, AMARELO) +
    bolinha(160, 187, 8.5, AMARELO_ESCURO) +
    brilho(160, 187, 0.6, BRANCO),
);

export const ILUSTRACOES = { boasVindas, quatroVidas, naoSeFabrica, vantagens, comoFunciona, comecar } as const;
export type NomeDaIlustracao = keyof typeof ILUSTRACOES;
