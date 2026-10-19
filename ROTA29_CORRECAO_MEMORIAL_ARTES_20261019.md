# ROTA29 — correções do piloto, 19/10/2026

## 1. Igreja Batista Memorial: CORRIGIDO NO BANCO

Situação identificada: dois cadastros com o nome "Igreja Batista Memorial de Macapa".
A exceção de membros ilimitados estava no cadastro órfão (sem pastor nem usuários), enquanto o cadastro operacional de Nilton (oito membros e licença aprovada) mantinha o limite padrão.

Correção transacional efetuada na base compartilhada: exceção `rota29_unlimited_church_members` movida para o cadastro operacional do pastor Nilton; cadastro órfão vazio excluído. **Nenhuma conta real ou histórico apagado**. O cadastro ativo é `bb1398de-0716-4860-92c8-59c54c5e45f5`.

Validação SQL: três membros fictícios realizaram convite → solicitação pendente → aprovação pastoral → vínculo, elevando a contagem de oito para onze. Todos os dados do teste foram revertidos (ROLLBACK). A exceção continua exclusiva da Memorial, não desativa aprovação pastoral; as demais igrejas permanecem limitadas a dez. A RPC do Painel Master mostra a Memorial com `member_limit: null` ("Sem limite"). A nova RPC privada de consulta pastoral `rota29_my_church_capacity()` retorna `unlimited: true`, `approved_members: 8`, `member_limit: null`.

## 2. Artes por gênero: CÓDIGO PREPARADO; NÃO LIBERADO

Usuário forneceu **duas imagens específicas**:
- Feminino: `1000668036.jpg` com texto "Bem-vinda"
- Masculino: `1000667237.jpg` com texto "Bem-vindo"

Foram preparadas no projeto as mudanças para, depois da escolha do perfil, apresentar a arte correspondente e o botão "Continuar minha jornada". O fluxo ainda depende da publicação destes **dois arquivos binários ORIGINAIS**, que não podem ser substituídos por fotografias ou posters genéricos.

**Pendência de execução no Work**:
1. Obter os dois uploads originais da conversa do ChatGPT ou o pacote `ROTA29_ARTES_BEM_VINDOS.zip` fornecido no mesmo chat (contém exatamente as duas imagens, não refazer com IA).
2. Adicionar às pastas do projeto somente na branch `rota29/pilot-readiness`:
   - `public/brand/rota29-bem-vindo.jpg` = `1000667237.jpg` (masculino)
   - `public/brand/rota29-bem-vinda.jpg` = `1000668036.jpg` (feminino)
3. No arquivo `app/start/page.tsx`, trocar `const WELCOME_POSTERS_READY = false` por `true`, após confirmar que ambos os binários foram inseridos.
4. Compilar, publicar no Vercel piloto e verificar os arquivos em HTTP 200, MIME `image/jpeg`, renderização mobile, fluxo homem/mulher e aprovação pastoral. **Não ativar a flag antes dos assets existirem**, pois isso faria o público receber telas incompletas.
5. **NUNCA modificar main**, e preservar Supabase compartilhado, identidades históricas e superadmins.

## 3. UI da capacidade pastoral

A interface do painel pastoral consulta `rota29_my_church_capacity()` e exibe "Participantes: 8 · Sem limite" na Memorial; outras igrejas exibem seu limite vigente. A avaliação e o acompanhamento continuam restritos à igreja do pastor.

## Validação final ainda pendente

Teste no navegador/celular de perfil masculino/feminino após importar artes e publicar; teste com o pastor para confirmação visual da capacidade no painel. Outros itens mantidos intactos.
