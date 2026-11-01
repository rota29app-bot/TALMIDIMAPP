# ROTA29 — Jornada no horário de oração (piloto)

## Fluxo liberado
1. Pastor vincula igreja, superadmin aprova, pastor autoriza participante.
2. Ao entrar na estação, participante escolhe o horário diário e o fuso detectado no celular.
3. Primeiro dia abre no próximo horário escolhido. Se o horário de hoje já passou, abre amanhã.
4. Participante lê e pratica durante o dia; ao final escreve o Memorial (armazenado em user_diary com vínculo por dia).
5. Servidor só aceita a conclusão com horário aberto, Memorial, TSD/intercessão, prática específica e pontuação.
6. Próximo dia abre **no dia seguinte**, na hora escolhida. Atrasos não possibilitam compensar vários dias no mesmo dia.
7. Alterar o horário em Meu ROTA29 não antecipa uma abertura já programada.
8. O participante pode baixar um arquivo de calendário (.ics) com 21 lembretes diários para importar no celular. **Notificação push remota com app fechado ainda não está configurada**. Importar o arquivo e autorizar alarmes do calendário é necessário.

## Segurança
- A nova interface chama apenas rota29_complete_verified_day.
- As funções antigas pilot_complete_day e rota29_complete_scheduled_day não têm EXECUTE para authenticated/anon/public.
- A função de preview administrativa rota29_admin_complete_day é separada e verifica is_super_admin.
- Horários, desbloqueios e vínculos de Memorial têm RLS e não permitem alteração direta por cliente.
- Decisões de autorização e tempo são feitas no servidor (não no relógio do navegador).
- Banco é compartilhado com a versão histórica. Contas e histórico existentes foram preservados; somente a branch rota29/pilot-readiness é publicada.

## Testes simulados executados com rollback
- Participante pendente e conta externa não configuram/progridem.
- Falta de práticas ou Memorial impede avançar.
- Com práticas+avaliação+Memorial e hora liberada, avança do Dia 1 ao Dia 2.
- Dia 2 aguarda o dia seguinte no horário marcado, sem abrir 24h após a conclusão.
- Tentativa de salvar Memorial ou avançar antes da hora falha.
- Alterar o horário não adianta dia pendente.
- Dados fictícios dos testes foram revertidos.

## Validação móvel que falta
- Google OAuth real em Android/iOS, PWA instalado, permissão do calendário, importação do .ics em aparelhos dos pastores.
- Atravessar 21 dias em tempo real ou por testes de relógio isolados (sem adulterar progresso real).
- Confirmar textos e experiência na tela pequena.
- Não anunciar *despertador nativo garantido*: o mecanismo de calendário fica sob controle do sistema operacional.
