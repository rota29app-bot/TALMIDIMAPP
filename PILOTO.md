# ROTA29 — Manual da versão paralela do piloto

## Endereços
- Piloto: https://rota29-piloto.vercel.app
- Produção original, preservada: https://rota29.vercel.app
- Branch do piloto: rota29/pilot-readiness
- Repositório: rota29app-bot/TALMIDIMAPP
- Supabase: TALMIDIM APP na organização rota29app

## Formato da jornada
O aplicativo completo tem sete estações. Neste piloto serão disponibilizadas apenas:
1. Intimidade com Deus: fundamento nos dias 1–7, prática contínua até o dia 21.
2. Família: fundamento nos dias 8–14, em paralelo à prática de Intimidade.
3. Compaixão e Graça: fundamento nos dias 15–21, em paralelo à prática de Intimidade.

Após completar realmente o dia 21 da Intimidade, o servidor concede a primeira insígnia "A Semente". As demais estações e insígnias não integram o piloto e não foram apagadas do código.

Datas propostas: jornada de 15/10 a 04/11/2026; coleta e avaliação institucional de 15/10 a 13/11/2026.

## Cadastro ponta a ponta (não pré-cadastrar igrejas)
1. O pastor abre o endereço do piloto, entra com Google e realiza a apresentação inicial.
2. Seleciona "Sou pastor" na tela "Minha igreja".
3. Informa nome oficial da igreja, cidade, UF, responsável, contato e convidados previstos. O Supabase cria a igreja, vincula seu usuário como pastor e gera um código de convite de 16 caracteres.
4. O pastor compartilha o código diretamente com os convidados.
5. Cada participante entra com sua própria conta Google, seleciona "Sou participante" e digita o código, vinculando-se à igreja correta.
6. Após o vínculo, conclui Radar, PDD e inicia a jornada.
7. O pastor acompanha somente os participantes da própria igreja no Painel Pastoral.
8. O administrador do ROTA29 acompanha o conjunto pelo Painel Master, aba Piloto.

Seis igrejas foram mencionadas pelo cliente como candidatas, mas não estão pré-cadastradas: Maranata em Macapá, PIB Betel em Santana, IB Pedras Vivas em Joinville, Nova Esperança em Nova Canaã, Quarta IB em Araguaína e PIB Goianinha.

## Contas anteriores
Fé em Missão designa o e-mail do administrador Nilton, NÃO é uma igreja participante.
Havia um cadastro antigo indevido com 20 usuários vinculados; ele foi renomeado "Arquivo técnico — contas anteriores (não é igreja)" para preservar os históricos. É excluído da lista de igrejas do piloto na interface administrativa e das métricas piloto. Não excluir nem desvincular estes usuários sem migração auditada e autorização.

## Segurança implementada
- As funções de criação de igreja e entrada por código verificam sessão autenticada.
- Cada conta pode se vincular somente a uma igreja via fluxo normal e não se promove a administrador por convite.
- Pastor vê somente os dados de sua igreja.
- Usuário recém-cadastrado no piloto não pode gravar manualmente progresso, desbloqueios ou insígnias; o servidor controla as mudanças.
- O servidor recusa avanço duplo no mesmo dia (horário de São Paulo) e estações fora da sequência.
- A primeira insígnia é gravada no servidor e não pode ser concedida pela simples visita à página.
- Formulários e indicadores do piloto já existentes continuam operacionais.

## Indicadores e instrumentos
Ficha inicial; número de convidados e cadastrados; início e retorno; ocorrências; questionários; evidências comerciais.
Separar intenção declarada, proposta, contrato e pagamento. Dados devem ser registrados com finalidade explícita e acesso controlado.
Convidados previstos no cadastro inicial são estimativas: a coordenação deve confirmar os totais oficiais na ficha do piloto.

## Testes executados no Supabase
Os testes foram executados em transação com ROLLBACK, sem criar igrejas ou usuários reais:
- Criação de duas igrejas, convite de 16 caracteres, vinculação de dois participantes;
- Recusa de segunda igreja para a mesma conta;
- Restrição de código de convite aos responsáveis;
- Bloqueio da escrita direta de progresso e insígnias;
- Limite de uma conclusão diária e proibição de iniciar segunda estação prematuramente;
- Bloqueio de relatórios administrativos para membro comum.
A suíte original supabase/tests/pilot_readiness.sql também passou nos seis grupos de verificações.

## Homologação ainda necessária
- Confirmar nas configurações de Auth do Supabase o Redirect URL https://rota29-piloto.vercel.app/auth/callback, para login Google nesta nova origem.
- Testar com contas reais de ensaio o cadastro da igreja, ingresso do participante, Radar e PDD e o painel pastoral.
- Conferir Android, iPhone, Chrome, Safari e o PWA instalado.
- Testar restauração de backup em ambiente isolado (o mesmo Supabase ainda é compartilhado entre as duas versões).
- Confirmar aviso de privacidade, responsável pelos dados, retenção e canal de suporte antes dos convites.
- Testar passagem dos 21 dias na prática e os dispositivos reais; testes SQL não substituem essa aceitação.
- Rever custos, licenciamento e escopo de manutenção antes de expandir.

A URL paralela acompanha a branch de piloto, e a main não foi publicada ou alterada.
