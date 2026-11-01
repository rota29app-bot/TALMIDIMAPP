# ROTA29 — suspensão e revalidação por igreja (16/10/2026)

## Estado verificado
- Preview: `https://rota29-piloto.vercel.app`. O `proxy.ts` da branch `rota29/pilot-readiness` mantém todo o app redirecionado a `/pilot-status`.
- Supabase compartilhado com a produção: `rota29_pilot_policy.lockdown_enabled = true`.
- Data final do piloto adiada provisoriamente de **13/11/2026 para 20/11/2026** (7 dias).
- Contas, histórico e `main` preservados.
- Nova tabela `public.rota29_member_approvals` (RLS habilitada, sem acesso direto de `authenticated`): somente aprovações novas e individuais contam. Inicialmente zero aprovados.
- `pilot_join_church`: exige código da igreja liberada pela coordenação, registra pedido `pending`, sem vincular `user_roles.igreja_id` ao piloto antes da aprovação.
- `rota29_pastor_pending_members`: pastor da igreja aprovada vê seus próprios pedidos.
- `rota29_pastor_review_member`: aprova, rejeita ou suspende. Verifica titularidade, limite de 10, isolamento e guarda vínculo anterior em `previous_igreja_id`.
- `rota29_pilot_access`: bloqueio global prioritário; com piloto aberto só permite participante explicitamente `approved` da igreja licenciada ou responsável pastoral; nunca modo Básico individual.
- `rota29_choose_basic`: função bloqueada neste piloto; opção retirada da tela.
- `rota29_pastoral_dashboard` e `rota29_set_pastoral_alert`: negam acesso sem autorização válida; relatório filtra participantes aprovados.
- Funções de inscrição, progressão, relatórios, gestão e aprovação estão sem permissão EXECUTE para usuários comuns enquanto fechado.

## NÃO REABRIR SEM AUTORIZAÇÃO DO NILTON

Passos de homologação para a REABERTURA, somente após autorização:
1. Confirmar backup/restauração e manter `main` intacta.
2. Restaurar o `proxy.ts` à versão que chama `updateSession`, preservando a verificação atual via `rota29_pilot_access`.
3. Restaurar no `app/layout.tsx` o splash e componentes originais da experiência PWA (temporariamente removidos durante o bloqueio).
4. Publicar/validar a branch do piloto; nunca fazer merge automático na `main`.
5. No Supabase, em UMA transação e SOMENTE quando liberado, executar:

```sql
begin;
grant execute on function public.pilot_register_church(text,text,text,text,text,integer,boolean) to authenticated;
grant execute on function public.pilot_join_church(text) to authenticated;
grant execute on function public.pilot_complete_day(text,integer) to authenticated;
grant execute on function public.pilot_my_church() to authenticated;
grant execute on function public.rota29_admin_approve_church(uuid,boolean) to authenticated;
grant execute on function public.rota29_admin_pilot_churches() to authenticated;
grant execute on function public.rota29_pastor_pending_members() to authenticated;
grant execute on function public.rota29_pastor_review_member(uuid,boolean) to authenticated;
grant execute on function public.rota29_pastoral_dashboard() to authenticated;
grant execute on function public.rota29_set_pastoral_alert(integer) to authenticated;
update public.rota29_pilot_policy set lockdown_enabled=false where id=true;
commit;
```

6. **Não reabilitar `rota29_choose_basic`**, que fica indisponível no piloto. Revisar `record_pilot_activity` antes de restaurar sua permissão de execução.
7. Testar em contas REAIS e separadas: coordenação aprova igreja, pastor recebe convite, participante informa código e fica pendente, pastor aprova; código de uma igreja não dá visibilidade à outra. Validar também rejeição, suspensão, limite e OAuth/PWA.
8. Se a interrupção passar dos sete dias adicionais, recalcular a data final antes de iniciar os testes.

## Observação
O bloqueio das permissões de acesso não é exclusão de contas Google nem revogação individual de sessões já emitidas. A autorização à jornada é sempre conferida no banco; histórico antigo não gera autorização de piloto.
