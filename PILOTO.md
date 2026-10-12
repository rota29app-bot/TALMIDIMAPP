# ROTA29 — operação do piloto

Período proposto: 15/10/2026 a 13/11/2026. Confirme com a coordenação antes de convidar participantes.

## Acesso do Nilton

Entre com Google usando a conta autorizada. No menu Perfil, use **Abrir administração**. O endereço direto é https://rota29.vercel.app/admin.

Na Visão Geral, cadastre igrejas e busque o e-mail já cadastrado de uma pessoa. Escolha a igreja e o tipo de vínculo. Confira antes de salvar: o acesso de pastor permite acompanhar os participantes dessa igreja. Vincular participante não concede administração. Uma mudança de igreja retira a pessoa da lista pastoral anterior.

## Cinco instrumentos

1. Ficha inicial: igreja, pastor, contato, convidados, expectativas, condições e canal de ajuda. Um novo registro atualiza a referência mantendo o anterior no histórico.
2. Controle de adesão: baixe participantes em Analytics e indicadores na aba Piloto. Una os arquivos pelo identificador da igreja. Preserve a planilha em acesso restrito.
3. Ocorrências: descrição, gravidade, frequência, impacto, situação e correção. Para atualizar, crie novo registro com o código anterior. Não apague evidências.
4. Experiência: registre respostas de participantes e pastores usando códigos. Pergunte sobre facilidade, utilidade, dificuldades e sugestões. Registre também não respostas na planilha de coordenação.
5. Comercial: separe intenção, proposta, contrato e pagamento. Registre modalidade, acessos e condições. O registro de um estágio não comprova uma transação sem evidência externa.

## Indicadores e limites

Cadastro = membros atualmente vinculados à igreja, excluindo administradores e pastores. Não é contagem histórica de novos cadastros em cada intervalo.
Início = pessoa que abriu uma tela da jornada no período. Retorno = pessoa com uso registrado em pelo menos dois dias distintos, no fuso de São Paulo. Trata-se de acesso, não comprovação de prática realizada ou satisfação.
Taxa de cadastro = cadastrados/convidados. Continuidade = retornaram/iniciaram. Denominadores zero ou desconhecidos não geram percentuais. A coleta diária começa com esta versão, sem reconstrução de acessos anteriores. As métricas refletem o vínculo atual: registre na coordenação mudanças de igreja durante o piloto.
As estações se sobrepõem a partir do marco do dia 7. Estação liberada e dia atual não significam percentual de conclusão.

## Antes de iniciar

- Confirmar a quarta igreja, pastores, e-mails, contatos e convidados. Os três nomes fornecidos foram preparados sem inventar vínculos.
- Confirmar canal de ajuda, finalidade da coleta, quem acessa os registros e prazo de retenção; informar os participantes.
- Fazer aceitação em um Android e um iPhone reais e nos navegadores usados pelas quatro igrejas. Redimensionar um navegador não substitui esse teste.
- Conferir recuperação do backup em ambiente separado. O arquivo existente foi validado para leitura, mas uma restauração completa ainda não foi ensaiada.
- Definir responsáveis por backup recorrente e incidentes. Um backup anterior à migração não substitui backups durante os 30 dias.
- Confirmar escopo dos R$300 mensais, limites dos planos e responsabilidade pelo Google OAuth. Preço e cobrança não foram inventados.

## Calendário

15–21/10: entrada, orientação e linha de base.
22–28/10: adoção e dificuldades repetidas.
29/10–07/11: experiência e correções críticas com histórico.
08–13/11: questionários e evidência comercial.

Decisão final: avançar, ajustar antes de ampliar ou evidências insuficientes. Não há meta arbitrária de sucesso. Informe numeradores, denominadores e dados ausentes.

## Recursos ainda incompletos

Notificações automáticas e Gerenciar Liderança continuam sem implementação. Salvar horários apenas preserva preferências no aparelho. Licenças pagas, desligamento/bloqueio de contas, cobrança e contratos precisam de regras de produto antes de automação. Não houve reset de contas ou exclusão de progresso.

## Testes de segurança

`supabase/tests/pilot_readiness.sql` cria dados sintéticos dentro de transação e desfaz tudo. Verifica membro sem elevação, administração negada, isolamento entre duas igrejas, pastor sem vínculo, funções pastorais, administração, registros imutáveis, deduplicação de uso e bloqueio de execução anônima. Não execute somente trechos: mantenha BEGIN/ROLLBACK.
