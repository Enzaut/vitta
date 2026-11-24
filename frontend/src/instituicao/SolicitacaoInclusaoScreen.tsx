import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ApiError } from "../api/client";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Campo, type EntradaRef } from "../components/Campo";
import { Tela } from "../components/Tela";
import { lerPosicaoAtual } from "../localizacao/posicaoAtual";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";
import { MSG_TELEFONE, OBRIGATORIO, mascararTelefone, telefoneValido } from "../validation/campos";
import { useInstituicao } from "./InstituicaoContext";

type Props = NativeStackScreenProps<RootStackParamList, "SolicitacaoInclusao">;
type NomeDoCampo = "nome" | "endereco" | "cidade" | "uf" | "telefone" | "horario" | "latitude" | "longitude";
type Erros = Partial<Record<NomeDoCampo, string>>;

// "-15,78" ou "-15.78" -> -15.78. Devolve null se não for um número.
function lerNumero(texto: string): number | null {
  const numero = Number(texto.trim().replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(numero) ? numero : null;
}

// Pedido de inclusão da instituição no mapa (também serve para corrigir um pedido recusado).
export function SolicitacaoInclusaoScreen({ navigation }: Props) {
  const { conta, painel, solicitarInclusao } = useInstituicao();
  const anterior = painel?.solicitacao ?? null;

  const [nome, setNome] = useState(anterior?.nome ?? conta?.nome ?? "");
  const [endereco, setEndereco] = useState(anterior?.endereco ?? "");
  const [cidade, setCidade] = useState(anterior?.cidade ?? "");
  const [uf, setUf] = useState(anterior?.uf ?? "DF");
  const [telefone, setTelefone] = useState(mascararTelefone(anterior?.telefone ?? conta?.telefone ?? ""));
  const [horario, setHorario] = useState(anterior?.horario ?? "");
  const [latitude, setLatitude] = useState(anterior ? String(anterior.latitude) : "");
  const [longitude, setLongitude] = useState(anterior ? String(anterior.longitude) : "");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [lendoPosicao, setLendoPosicao] = useState(false);

  const enderecoRef = useRef<EntradaRef>(null);
  const cidadeRef = useRef<EntradaRef>(null);
  const ufRef = useRef<EntradaRef>(null);
  const telefoneRef = useRef<EntradaRef>(null);
  const horarioRef = useRef<EntradaRef>(null);
  const latitudeRef = useRef<EntradaRef>(null);
  const longitudeRef = useRef<EntradaRef>(null);

  function limparErro(campo: NomeDoCampo) {
    setErros(({ [campo]: _removido, ...resto }) => resto);
  }

  async function usarMinhaLocalizacao() {
    setErroGeral(null);
    setLendoPosicao(true);
    try {
      const { latitude: lat, longitude: lng } = await lerPosicaoAtual();
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      setErros(({ latitude: _a, longitude: _b, ...resto }) => resto);
    } catch (e) {
      setErroGeral(e instanceof Error ? e.message : "Não foi possível ler a sua localização.");
    } finally {
      setLendoPosicao(false);
    }
  }

  function validar(): Erros {
    const novos: Erros = {};
    if (!nome.trim()) novos.nome = OBRIGATORIO;
    else if (nome.trim().length < 3) novos.nome = "Informe o nome da instituição.";
    if (!endereco.trim()) novos.endereco = OBRIGATORIO;
    else if (endereco.trim().length < 5) novos.endereco = "Informe o endereço completo.";
    if (!cidade.trim()) novos.cidade = OBRIGATORIO;
    if (!/^[A-Za-z]{2}$/.test(uf.trim())) novos.uf = "Informe a sigla do estado com 2 letras, por exemplo DF.";
    if (telefone && !telefoneValido(telefone)) novos.telefone = MSG_TELEFONE;
    if (!horario.trim()) novos.horario = OBRIGATORIO;

    const lat = lerNumero(latitude);
    const lng = lerNumero(longitude);
    if (lat === null) novos.latitude = latitude.trim() ? "Informe um número, por exemplo -15,7838." : OBRIGATORIO;
    else if (lat < -90 || lat > 90) novos.latitude = "A latitude deve ser um número entre -90 e 90.";
    if (lng === null) novos.longitude = longitude.trim() ? "Informe um número, por exemplo -47,8859." : OBRIGATORIO;
    else if (lng < -180 || lng > 180) novos.longitude = "A longitude deve ser um número entre -180 e 180.";
    return novos;
  }

  async function enviar() {
    setErroGeral(null);
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      await solicitarInclusao({
        nome: nome.trim(),
        endereco: endereco.trim(),
        cidade: cidade.trim(),
        uf: uf.trim().toUpperCase(),
        ...(telefone && { telefone }),
        horario: horario.trim(),
        latitude: lerNumero(latitude)!,
        longitude: lerNumero(longitude)!,
      });
      navigation.goBack();
    } catch (erro) {
      if (erro instanceof ApiError && erro.campos) setErros(erro.campos as Erros);
      else setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Pedir inclusão no mapa</Text>
      <Text style={estilos.subtitulo}>Estes dados aparecem para os doadores depois que o pedido for aprovado.</Text>

      {erroGeral && <Aviso tipo="erro" texto={erroGeral} aoFechar={() => setErroGeral(null)} />}

      <Campo
        rotulo="Nome da instituição"
        icone="business-outline"
        value={nome}
        onChangeText={(t) => {
          setNome(t);
          limparErro("nome");
        }}
        erro={erros.nome}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => enderecoRef.current?.focus()}
      />

      <Campo
        ref={enderecoRef}
        rotulo="Endereço"
        icone="location-outline"
        placeholder="Rua, número, bairro"
        value={endereco}
        onChangeText={(t) => {
          setEndereco(t);
          limparErro("endereco");
        }}
        erro={erros.endereco}
        autoCapitalize="sentences"
        returnKeyType="next"
        onSubmitEditing={() => cidadeRef.current?.focus()}
      />

      <Campo
        ref={cidadeRef}
        rotulo="Cidade"
        icone="home-outline"
        value={cidade}
        onChangeText={(t) => {
          setCidade(t);
          limparErro("cidade");
        }}
        erro={erros.cidade}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => ufRef.current?.focus()}
      />

      <Campo
        ref={ufRef}
        rotulo="UF"
        icone="flag-outline"
        value={uf}
        onChangeText={(t) => {
          setUf(t.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2));
          limparErro("uf");
        }}
        erro={erros.uf}
        autoCapitalize="characters"
        maxLength={2}
        returnKeyType="next"
        onSubmitEditing={() => telefoneRef.current?.focus()}
      />

      <Campo
        ref={telefoneRef}
        rotulo="Telefone (opcional)"
        icone="call-outline"
        placeholder="(61) 3327-4413"
        value={telefone}
        onChangeText={(t) => {
          setTelefone(mascararTelefone(t));
          limparErro("telefone");
        }}
        erro={erros.telefone}
        keyboardType="phone-pad"
        maxLength={15}
        returnKeyType="next"
        onSubmitEditing={() => horarioRef.current?.focus()}
      />

      <Campo
        ref={horarioRef}
        rotulo="Horário de atendimento"
        icone="time-outline"
        placeholder="Segunda a sexta, das 8h às 17h"
        value={horario}
        onChangeText={(t) => {
          setHorario(t);
          limparErro("horario");
        }}
        erro={erros.horario}
        autoCapitalize="sentences"
        returnKeyType="next"
        onSubmitEditing={() => latitudeRef.current?.focus()}
      />

      <Text style={estilos.secao}>Localização no mapa</Text>
      <Text style={estilos.dica}>
        Se você está na instituição agora, toque no botão para preencher a latitude e a longitude. Se não, digite as coordenadas (dá para copiar do Google Maps).
      </Text>
      <Botao titulo="Usar minha localização" variante="secundario" aoPressionar={usarMinhaLocalizacao} carregando={lendoPosicao} />

      <Campo
        ref={latitudeRef}
        rotulo="Latitude"
        icone="navigate-outline"
        placeholder="-15,7838"
        value={latitude}
        onChangeText={(t) => {
          setLatitude(t);
          limparErro("latitude");
        }}
        erro={erros.latitude}
        keyboardType="numbers-and-punctuation"
        returnKeyType="next"
        onSubmitEditing={() => longitudeRef.current?.focus()}
      />

      <Campo
        ref={longitudeRef}
        rotulo="Longitude"
        icone="navigate-outline"
        placeholder="-47,8859"
        value={longitude}
        onChangeText={(t) => {
          setLongitude(t);
          limparErro("longitude");
        }}
        erro={erros.longitude}
        keyboardType="numbers-and-punctuation"
        returnKeyType="done"
        onSubmitEditing={enviar}
      />

      <Botao titulo="Enviar pedido" aoPressionar={enviar} carregando={enviando} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  secao: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto, marginTop: 8, marginBottom: 6 },
  dica: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 19, marginBottom: 12 },
});
