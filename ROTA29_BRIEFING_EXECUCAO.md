# ROTA29 v2.0 — Modelo Institucional (briefing oficial)

## Identidade e posição
Rota 29 substitui o antigo nome Talmidim em toda a interface. Produto de formação de hábitos cristãos para vida real, não só conteúdos e leituras. Estratégia B2B2C: pastor/igreja contrata a camada institucional; membro usa individualmente.

## Dois planos do briefing
- **Básico** — uso individual da jornada, sem painel pastoral. A seleção é feita pelo usuário após login, em /igreja, via RPC `rota29_choose_basic`.
- **Liderança (institucional)** — cadastro da igreja pelo pastor, código de convite e painel restrito da própria igreja. A cobrança será especificada posteriormente. No piloto o status é `pilot`, não é uma venda.
  
## Papéis da experiência
- **Superadmin** — os dois usuários autorizados (Newton e titular de rota29.app@gmail.com) abrem /admin automaticamente; não fazem Radar/PDD por obrigação.
- **Pastor** — após primeiro login e cadastro da igreja, acessa /pastor; pode configurar o período para alerta e exportar CSV.
- **Membro institucional** — informado código enviado pelo pastor; após ingresso faz onboarding, Radar e PDD; registra os dias da jornada.
- **Membro Básico** — sem vínculo com igreja; faz onboarding, Radar e PDD, mas sem poder visualizar informações institucionais.

## Prioridades de implementação
1. Login Google sem duplicar autenticação.
2. Resolução de função com `pilot_my_church`; /entrada é o roteador autorizado.
3. Cadastro do pastor por `pilot_register_church`; membros via `pilot_join_church`.
4. Progresso próprio via `pilot_complete_day`.
5. Painel pastoral via `rota29_pastoral_dashboard`, com dados individualizados e agregados exclusivamente da própria igreja.
6. Alerta configurável via `rota29_set_pastoral_alert` (1–90 dias).
7. CSV com resumo e relatório por membro; não declarar intenção comercial como contrato.
8. Dados históricos preservados, inclusive arquivo técnico da conta antiga.

## Objetos criados em Supabase
- `public.rota29_basic_users` (RLS e sem grants de escrita direta)
- `public.rota29_church_settings` (RLS; license_status pilot/active/paused/expired, plan_code leadership, alert_after_days).
- `public.rota29_choose_basic()`, `public.rota29_set_pastoral_alert(integer)`, `public.rota29_pastoral_dashboard()`.
- Extensão do `public.pilot_my_church()` para incluir permissão e modo individual.
- `public.pilot_complete_day(text,integer)` admite membros individuais autorizados, além de membros institucionais.
- Trigger de registro `rota29_pilot_church_settings` automatiza a configuração de igrejas novas.

## Limites e próximos testes
- Confirmação do login OAuth, do cadastro e do fluxo completo em dispositivos reais.
- Testes temporais de 21 dias, inclusive marcos e primeira insígnia, além de recuperação de backup isolado.
- Política de tratamento de dados, responsabilidades e canal de suporte.
- Precificação, cobrança e contratos comerciais não foram definidos no briefing e não foram inventados.
- A branch `main` não deve ser mesclada sem aprovação do proprietário.
