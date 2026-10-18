# Excecao institucional: Igreja Batista Memorial de Macapá

O cadastro duplicado mais antigo, criado em 18/10/2026 às 15:28:26 UTC, foi excluído por solicitação expressa do responsável. Foi verificado previamente que esse registro não continha vínculos de contas, inscrições ou progresso.

Permaneceu apenas o cadastro criado em 18/10/2026 às 15:31:08 UTC, identificado internamente pela igreja de nome **Igreja Batista Memorial de Macapa**. A ele foi associada uma exceção restrita de capacidade ilimitada para participantes.

**A exceção não equivale a uma inscrição no piloto nem concede acesso à jornada.** No instante desta mudança, esse registro estava sem vínculo de pastor e sem linha em `pilot_church_registrations`. O próximo passo institucional é identificar com segurança o pastor responsável e vincular o cadastro existente pelo fluxo aprovado, sem gerar um terceiro registro e sem transformar a conta superadmin do Nilton em conta pastoral.

A aprovação de cada participante continua exclusiva do pastor responsável. O banco impõe o limite geral de 10 em duas camadas, função de aprovação e trigger de vínculo, ambas ajustadas para consultar a exceção nominal. O Painel Master apresenta **Sem limite** exclusivamente para igreja com exceção.

Teste SQL com dados transacionais descartados: Memorial aprovou 11 membros, outra igreja bloqueou a 11ª vaga após dez aprovações, exibindo corretamente a capacidade no painel. Não foram criados usuários fictícios permanentes. A branch `main` não foi modificada.