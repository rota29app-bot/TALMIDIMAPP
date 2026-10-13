"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "../../utils/supabase/client";

type Church = { igreja_id: string; nome: string };
type RecordItem = { id: string; igreja_id: string; kind: string; payload: Record<string, string>; created_at: string };
type Metric = { igreja_id: string; cadastrados: number; iniciaram: number; retornaram: number };
type Registration = { igreja_id: string; nome: string; pastor_nome: string; cidade: string; estado: string; contato: string; convidados_previstos: number; cadastrado_em: string };
type Field = { key: string; label: string; options?: string[]; numeric?: boolean; optional?: boolean };
const instruments: Record<string, { title: string; fields: Field[] }> = {
  igreja: { title: "Ficha inicial da igreja", fields: [
    { key: "pastor", label: "Pastor responsável" }, { key: "contato", label: "Contato do pastor" },
    { key: "convidados", label: "Quantidade de convidados", numeric: true },
    { key: "expectativas", label: "Expectativas" }, { key: "condicoes", label: "Condições de participação e canal de ajuda" },
  ] },
  ocorrencia: { title: "Problema técnico ou solicitação", fields: [
    { key: "descricao", label: "O que aconteceu?" }, { key: "gravidade", label: "Gravidade", options: ["Baixa", "Média", "Alta", "Impede o uso"] },
    { key: "frequencia", label: "Frequência" }, { key: "impacto", label: "Impacto e quantidade de pessoas afetadas" },
    { key: "situacao", label: "Situação", options: ["Aberto", "Em análise", "Corrigido", "Verificado"] },
    { key: "correcao", label: "Correção e tempo de resolução", optional: true },
    { key: "referencia", label: "Código da ocorrência anterior (para atualização)", optional: true },
  ] },
  experiencia: { title: "Questionário de experiência", fields: [
    { key: "publico", label: "Quem respondeu?", options: ["Participante", "Pastor"] },
    { key: "codigo", label: "Código do participante (sem nome ou e-mail)" },
    { key: "facilidade", label: "Como foi usar o aplicativo?", options: ["Muito difícil", "Difícil", "Regular", "Fácil", "Muito fácil"] },
    { key: "utilidade", label: "O que foi útil na experiência?" }, { key: "dificuldades", label: "Quais dificuldades encontrou?" },
    { key: "sugestoes", label: "O que deveria melhorar?" },
  ] },
  comercial: { title: "Interesse comercial", fields: [
    { key: "modalidade", label: "Modalidade", options: ["Individual", "Institucional"] },
    { key: "evidencia", label: "Estágio comprovado", options: ["Intenção declarada", "Proposta apresentada", "Contrato assinado", "Pagamento recebido"] },
    { key: "acessos", label: "Quantidade de acessos considerada", numeric: true },
    { key: "condicoes", label: "Condições para contratar e evidência do estágio" },
  ] },
};

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function download(rows: unknown[][], name: string) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + rows.map(row => row.map(csvCell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function ratio(n: number, d: number | null) {
  return d === null || d === 0 ? "Não calculável" : `${n} de ${d} (${Math.round(n / d * 100)}%)`;
}
async function readRecords(client: ReturnType<typeof createClient>) {
  const rows: RecordItem[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("pilot_records").select("id,igreja_id,kind,payload,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
    if (error) return { data: rows, error };
    rows.push(...(data || []));
    if ((data || []).length < 500) return { data: rows, error: null };
  }
}

export default function PilotWorkspace({ churches }: { churches: Church[] }) {
  const client = createClient();
  const [kind, setKind] = useState("igreja");
  const [church, setChurch] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState("2026-10-15");
  const [end, setEnd] = useState("2026-11-13");
  const requestNumber = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++requestNumber.current;
    const [r, m, c] = await Promise.all([
      readRecords(client),
      client.rpc("admin_pilot_metrics", { p_start: start, p_end: end }),
      client.rpc("admin_pilot_registrations"),
    ]);
    if (request !== requestNumber.current) return;
    if (r.error || m.error || c.error) setError("Não foi possível carregar os registros do piloto. Tente atualizar; nenhum dado foi substituído por zero.");
    else { setError(""); setRecords(r.data || []); setMetrics(m.data || []); setRegistrations(c.data || []); }
    setLoading(false);
  }, [client, start, end]);
  // refresh only sets React state after both asynchronous database requests finish.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const { error: failure } = await client.from("pilot_records").insert({ igreja_id: church, kind, payload });
    setBusy(false);
    if (failure) { setError("Não foi possível salvar. Seus campos foram mantidos para tentar novamente."); return; }
    form.reset(); setMessage("Registro salvo. Atualizações são novos registros, preservando o histórico."); await refresh();
  }
  const input = "w-full min-w-0 bg-bg-main border border-accent/30 rounded-xl px-3 py-3 text-sm";
  const totals = metrics.reduce((sum, m) => ({ registered: sum.registered + Number(m.cadastrados), started: sum.started + Number(m.iniciaram), returned: sum.returned + Number(m.retornaram) }), { registered: 0, started: 0, returned: 0 });
  const invitedFor = (igrejaId: string): number | null => {
    const record = records.find(r => r.kind === "igreja" && r.igreja_id === igrejaId);
    if (record && record.payload.convidados !== undefined && record.payload.convidados !== "") return Number(record.payload.convidados);
    const initial = registrations.find(r => r.igreja_id === igrejaId);
    return initial ? Number(initial.convidados_previstos) : null;
  };
  const allInvitesKnown = churches.every(i => invitedFor(i.igreja_id) !== null);
  const totalInvited = allInvitesKnown ? churches.reduce((sum, i) => sum + (invitedFor(i.igreja_id) || 0), 0) : null;
  return <section className="px-6 mt-8 space-y-6">
    <div className="bg-bg-card border border-accent/30 rounded-2xl p-5 space-y-3">
      <h2 className="text-lg font-bold">Como funciona a nova entrada do ROTA29</h2>
      <p className="text-sm text-text-muted">As igrejas não devem ser cadastradas antecipadamente pelo administrador: o processo de inscrição também faz parte do teste.</p>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li><strong>Pastor:</strong> abre o link do ROTA29, entra com Google e escolhe seu perfil.</li>
        <li><strong>Instituição:</strong> seleciona “Sou pastor” e informa igreja, cidade, UF, responsável, contato e convidados previstos.</li>
        <li><strong>Convite:</strong> o sistema cria a igreja e gera um código que o pastor compartilha com os participantes.</li>
        <li><strong>Participante:</strong> entra com sua própria conta Google, escolhe “Sou participante” e informa o código recebido.</li>
        <li><strong>Jornada:</strong> realiza Radar e PDD, depois Intimidade, Família e Compaixão e Graça, até a primeira insígnia.</li>
        <li><strong>Acompanhamento:</strong> pastor visualiza sua igreja; somente os administradores gerais visualizam todas.</li>
      </ol>
      <p className="text-xs text-text-muted">Para testar a inscrição completa, use duas contas Google de ensaio sem vínculo anterior: uma de pastor e uma de participante. Seu acesso administrativo permanece separado.</p>
    </div>
    <div><h2 className="text-xl font-serif font-bold">Painel do piloto</h2>
      <p className="text-sm text-text-muted mt-2">Jornada de 21 dias: 15/10 a 04/11, Intimidade, Família e Compaixão e Graça. Primeira insígnia ao final dos 21 dias.</p>
      <p className="text-sm text-text-muted mt-2">Acompanhamento de 30 dias, até 13/11. Entrada: 15–21/10 · Adoção: 22–28/10 · Experiência: 29/10–07/11 · Avaliação final: 08–13/11.</p>
      <nav className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm" aria-label="Navegação do piloto"><a href="#pilot-results" className="rounded-lg border border-accent/30 p-3">1. Resultados</a><a href="#pilot-form" className="rounded-lg border border-accent/30 p-3">2. Registros</a><a href="#pilot-history" className="rounded-lg border border-accent/30 p-3">3. Histórico</a></nav>
      <p className="text-sm mt-2">As próprias igrejas se cadastram pela tela Minha igreja; participantes usam o código do pastor. Registre fatos confirmados e não confunda campos preenchidos com evidências externas.</p>
    </div>
    <div className="bg-bg-card border border-accent/20 rounded-2xl p-4 space-y-3">
      <h3 className="font-bold">Cadastro institucional automático</h3>
      <p className="text-xs text-text-muted">Igrejas registradas por seus próprios responsáveis. Não há instituições pré-cadastradas.</p>
      {registrations.length === 0 && <p className="text-sm">Nenhuma igreja entrou no piloto ainda.</p>}
      {registrations.map(r => <div key={r.igreja_id} className="border-t border-accent/20 pt-3 text-sm">
        <strong>{r.nome}</strong>
        <p>{r.cidade}/{r.estado} · Pastor: {r.pastor_nome}</p>
        <p>Contato: {r.contato} · Convidados previstos: {r.convidados_previstos}</p>
        <p className="text-xs text-text-muted">Cadastro: {new Date(r.cadastrado_em).toLocaleDateString("pt-BR")}</p>
      </div>)}
    </div>
    <div id="pilot-results" className="bg-bg-card border border-accent/20 rounded-2xl p-4 space-y-3 scroll-mt-24">
      <h3 className="font-bold">Adesão e continuidade</h3>
      <div className="grid grid-cols-2 gap-3"><label>Início<input aria-label="Início do período" type="date" value={start} onChange={e => { setLoading(true); setStart(e.target.value); }} className={input} /></label>
      <label>Fim<input aria-label="Fim do período" type="date" value={end} min={start} onChange={e => { setLoading(true); setEnd(e.target.value); }} className={input} /></label></div>
      <p className="text-xs text-text-muted">Cadastrados: membros vinculados atualmente, excluindo pastores e administradores. Início: uso de uma tela da jornada em um dia do período. Retorno: uso em pelo menos dois dias distintos, no horário de Brasília. A coleta começa nesta versão; não reconstrói o passado. Convites vêm primeiro da ficha inicial; sem ela, usa-se a previsão informada pela própria igreja no cadastro. Números previstos precisam ser confirmados pela coordenação.</p>
      {!loading && !error && <div className="border border-accent/30 rounded-xl p-3"><h4 className="font-bold">Consolidado geral</h4><p className="text-sm">Cadastros / convites: {ratio(totals.registered, totalInvited)}</p><p className="text-sm">Iniciaram: {totals.started} · Retorno / início: {ratio(totals.returned, totals.started)}</p></div>}
      {loading ? <p role="status">Carregando indicadores…</p> : !error && churches.map(i => {
        const metric = metrics.find(m => m.igreja_id === i.igreja_id);
        const invited = invitedFor(i.igreja_id);
        return <div key={i.igreja_id} className="border-t border-accent/20 pt-3"><h4 className="font-bold">{i.nome}</h4>
          <p className="text-sm">Cadastros / convites: {ratio(Number(metric?.cadastrados || 0), invited)}</p>
          <p className="text-sm">Iniciaram: {metric?.iniciaram || 0} · Retorno / início: {ratio(Number(metric?.retornaram || 0), Number(metric?.iniciaram || 0))}</p>
          {invited !== null && Number(metric?.cadastrados || 0) > invited && <p className="text-sm text-amber-600">Confira a ficha: existem mais cadastros do que convites registrados.</p>}
        </div>;
      })}
      <button type="button" onClick={() => void refresh()} className="underline">Atualizar dados</button>
      <button type="button" disabled={loading || !!error} className="block underline disabled:opacity-40" onClick={() => download([
        ["igreja_id", "igreja", "convidados", "cadastrados", "iniciaram", "retornaram", "inicio", "fim"],
        ...churches.map(i => { const m = metrics.find(m => m.igreja_id === i.igreja_id); return [i.igreja_id, i.nome, invitedFor(i.igreja_id) ?? "Não informado", m?.cadastrados ?? 0, m?.iniciaram ?? 0, m?.retornaram ?? 0, start, end]; }),
      ], "rota29-adesao.csv")}>Baixar controle de adesão</button>
    </div>
    <div id="pilot-form" className="bg-bg-card border border-accent/20 rounded-2xl p-4 space-y-4 scroll-mt-24">
      <h3 className="font-bold">Registrar evidência</h3>
      <label className="block">Igreja<select aria-label="Igreja do registro" className={input} value={church} onChange={e => setChurch(e.target.value)}><option value="">Selecione</option>{churches.map(i => <option key={i.igreja_id} value={i.igreja_id}>{i.nome}</option>)}</select></label>
      <label className="block">Instrumento<select aria-label="Instrumento" className={input} value={kind} onChange={e => { setKind(e.target.value); setMessage(""); }}>{Object.entries(instruments).map(([key, item]) => <option key={key} value={key}>{item.title}</option>)}</select></label>
      <form key={kind} onSubmit={save} className="space-y-3">
        {instruments[kind].fields.map(field => <label key={field.key} className="block text-sm">{field.label}{field.optional ? " (opcional)" : ""}
          {field.options ? <select name={field.key} required className={input}><option value="">Selecione</option>{field.options.map(o => <option key={o}>{o}</option>)}</select>
          : <input name={field.key} type={field.numeric ? "number" : "text"} min={field.numeric ? 0 : undefined} step={field.numeric ? 1 : undefined} maxLength={2000} required={!field.optional} className={input} />}
        </label>)}
        <button disabled={busy || !church} className="bg-accent text-bg-main px-5 py-3 rounded-xl font-bold disabled:opacity-40">{busy ? "Salvando…" : "Salvar registro"}</button>
      </form>
      <p className="text-xs text-text-muted">Use códigos para participantes e evite conteúdo do diário, do Radar ou dados de terceiros. Somente administradores acessam estes registros. A coordenação deve confirmar finalidade, prazo de retenção e canal de suporte antes de coletar respostas.</p>
      <p className="text-xs text-text-muted">Interesse declarado não é venda. Proposta, contrato e pagamento são estágios separados. Este formulário registra evidências; não cobra valores nem firma contratos.</p>
    </div>
    {error && <p role="alert" className="text-red-500">{error}</p>}{message && <p role="status">{message}</p>}
    <div id="pilot-history" className="space-y-3 scroll-mt-24"><h3 className="font-bold">Histórico dos registros</h3>
      <p className="text-xs">{records.length} registros no histórico. Para corrigir uma ocorrência, crie outra indicando o código anterior.</p>
      <button className="underline" disabled={loading || !!error} onClick={() => download([["id", "igreja_id", "instrumento", "data", "dados"], ...records.map(r => [r.id, r.igreja_id, r.kind, r.created_at, JSON.stringify(r.payload)])], "rota29-registros.csv")}>Baixar registros</button>
      {records.length === 0 && !loading && !error && <p>Nenhuma evidência registrada.</p>}
      {records.filter(r => !church || r.igreja_id === church).map(r => <article key={r.id} className="bg-bg-card border border-accent/20 rounded-xl p-4 break-words"><p className="font-bold">{instruments[r.kind]?.title} · {churches.find(i => i.igreja_id === r.igreja_id)?.nome}</p><p className="text-xs">{new Date(r.created_at).toLocaleString("pt-BR")} · Código: {r.id}</p><dl className="text-sm mt-2">{Object.entries(r.payload).map(([key, value]) => <div key={key}><dt className="font-semibold">{instruments[r.kind]?.fields.find(f => f.key === key)?.label || key}</dt><dd>{value || "Não informado"}</dd></div>)}</dl></article>)}
    </div>
  </section>;
}
