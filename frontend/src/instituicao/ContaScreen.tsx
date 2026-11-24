import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ApiError } from "../api/client";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { LinhaDado } from "../components/LinhaDado";
import { Tela } from "../components/Tela";
import type { AbaInstituicaoProps } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { mascararCnpj, mascararTelefone } from "../validation/campos";
import { useInstituicao } from "./InstituicaoContext";

type Props = AbaInstituicaoProps<"ContaDaInstituicao">;

// Dados da conta da instituição, sair e excluir a conta.
export function ContaScreen(_: Props) {
  const { conta, sair, excluirConta } = useInstituicao();
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    try {
      await excluirConta();
      // A conta some e o app volta para a tela inicial.
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível excluir a conta. Tente novamente.");
      setExcluindo(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Conta da instituição</Text>
      <Text style={estilos.subtitulo}>Dados do cadastro.</Text>

      {erro && <Aviso tipo="erro" texto={erro} aoFechar={() => setErro(null)} />}

      <View style={estilos.cartao}>
        <LinhaDado rotulo="Nome" valor={conta?.nome ?? ""} />
        <LinhaDado rotulo="CNPJ" valor={mascararCnpj(conta?.cnpj ?? "")} />
        <LinhaDado rotulo="E-mail" valor={conta?.email ?? ""} />
        <LinhaDado rotulo="Telefone" valor={conta?.telefone ? mascararTelefone(conta.telefone) : "Não informado"} />
      </View>

      <View style={estilos.botoes}>
        <Botao titulo="Sair" variante="secundario" aoPressionar={sair} />

        {confirmando ? (
          <View style={estilos.confirmacao}>
            <Text style={estilos.aviso}>
              Isso apaga a conta, tira a instituição do mapa e remove as campanhas e os agendamentos dela. Não dá para desfazer.
            </Text>
            <Botao titulo="Sim, excluir tudo" variante="perigo" aoPressionar={excluir} carregando={excluindo} />
            <Botao titulo="Cancelar" variante="secundario" aoPressionar={() => setConfirmando(false)} desabilitado={excluindo} />
          </View>
        ) : (
          <Botao titulo="Excluir conta" variante="secundario" aoPressionar={() => setConfirmando(true)} />
        )}
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 16, marginBottom: 24 },
  botoes: { gap: 12 },
  confirmacao: { gap: 12, backgroundColor: cores.fundoErro, borderRadius: raio, padding: 16 },
  aviso: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.primariaEscura, lineHeight: 20 },
});
