# Guia do Usuário — Personal+ (Dielly OS)

Este é o guia para quem vai **usar** o Personal+ no dia a dia (Dielly e esposa). Para
detalhes técnicos de como o sistema é construído, veja a documentação técnica listada
no `README.md`.

## 1. Acessando o sistema

1. Abra o endereço informado por quem administra o sistema (ex: `http://localhost:8000`).
2. Faça login com seu usuário e senha:

   | Usuário | Senha | Perfil |
   |---|---|---|
   | `dielly` | `dielly123` | OWNER (acesso total) |
   | `esposa` | `esposa123` | FAMILY_ADMIN (acesso à família, sem áreas de trabalho/vagas/administração) |

3. Você continua logado mesmo fechando e reabrindo a aba, até clicar em **Sair** (menu
   do seu avatar, canto superior direito).

> Dica: peça para quem administra trocar sua senha em **Administração → User
> Management** se quiser uma senha própria.

## 2. Navegando pelo sistema

- **Menu lateral** (esquerda): agrupado por área — Command Center, Life (Família,
  Igreja, Financeiro, Hobbies & Viagens, Saúde), Professional (Trabalho, Carreira,
  Vagas, Inglês, Estudos), Intelligence (IA, decisões, dores, ideias, memória, CRM),
  Projects, Admin e Owner. Você só vê os módulos aos quais tem permissão.
- **Cabeçalho** (topo): sino de notificações, botão de tema claro/escuro, e seu
  avatar (menu de logout).
- **Abas internas**: a maioria dos módulos tem abas (ex: Finanças tem Dashboard,
  Transações, Spending Intelligence, Goal Manager, Forecast…).

## 3. Command Center — seu painel do dia

É a primeira tela após o login. Mostra:

- Suas **3 prioridades** do dia (tarefas mais urgentes/importantes).
- **Indicadores** rápidos (tarefas abertas, filhos cadastrados, saldo financeiro,
  minutos de inglês na semana).
- **Agenda** do período selecionado (Hoje / Semana / Mês) — reúne tarefas, agenda da
  igreja, entrevistas de emprego e viagens.
- **AI Chief of Staff** — insights automáticos (ex: "você tem reuniões demais essa
  semana", "inglês abaixo da meta"). Clique em "Ver todos" para a lista completa em
  **AI Insights**.

## 4. Criando, editando e excluindo registros

O padrão é o mesmo em quase todos os módulos:

1. Clique em **+ Novo** no canto superior direito da lista.
2. Preencha o formulário (campos com `*` são obrigatórios) e clique em **Criar**.
3. Para editar, clique em qualquer linha da tabela — o mesmo formulário abre
   preenchido; altere e clique em **Salvar**.
4. Para excluir, use o botão **Excluir** na linha — sempre pede confirmação antes.
   Registros excluídos não aparecem mais nas listas (o sistema não perde o dado de
   verdade, mas ele some da sua visão — só um Admin consegue restaurar via backup).

### Visibilidade de cada registro

Ao criar/editar um registro você pode escolher:

- **Privado (só eu)** — só você vê.
- **Família** — qualquer pessoa com acesso ao Personal+ vê.

Isso é independente da permissão do módulo: você pode ter acesso ao módulo Financeiro
e mesmo assim não ver um lançamento que outra pessoa marcou como privado.

## 5. Tasks (Tarefas)

Menu **Tasks**: lista central de tarefas de todos os módulos. Filtre por módulo,
status ou responsável. Clique em **+ Nova tarefa** para criar uma tarefa avulsa, ou
use o botão **Concluir** direto na lista quando terminar algo.

## 6. Notificações

Sino no topo da tela: mostra alertas gerados pelo sistema (ex: "ticket de segurança
em atraso", cruzamentos entre módulos como "viagem planejada acima do orçamento").
Clique em uma notificação para marcá-la como lida.

## 7. Busca e Calendário globais

- **Global Search**: digite qualquer termo (nome de pessoa, projeto, vaga, viagem,
  decisão…) e o sistema procura em todos os módulos aos quais você tem acesso.
- **Global Calendar**: calendário mensal de verdade — navegue entre os meses,
  cada categoria (Família, Igreja, Viagens, Carreira, Entrevistas, Saúde,
  Estudos, Tarefas) tem uma cor própria, clique numa categoria na legenda para
  mostrar/ocultar, e clique em qualquer dia para ver os compromissos daquele
  dia. Uma lista completa de todos os próximos compromissos fica logo abaixo.

## 8. Módulos por área

### Vida pessoal e família
- **Família**: casal, filhos, pais/mãe, casa — cada um com sua própria aba.
- **Family Hub**: painel compartilhado com a família — próximos compromissos e o
  indicador **Family Load** (mostra se as responsabilidades estão desequilibradas
  entre as pessoas, sem virar competição).
- **Igreja**: cargos, pessoas, agenda, pregações, projetos e acompanhamento pastoral.
- **Financeiro**: lançamentos, metas, projeção financeira, e o **Agente de Decisão
  Financeira** (aba "Financial Decision Agent") — informe um valor e uma descrição
  (ex: "viagem para Orlando") e o sistema analisa se cabe no seu orçamento.
- **Hobbies & Viagens**: interesses, restaurantes, passeios, e o planejador de
  viagens completo com checklist e orçamento.
- **Saúde**: consultas, exames, medicamentos, hábitos (uso administrativo, não é
  diagnóstico médico).

### Profissional
- **Trabalho**: registre reuniões, tickets, e trabalho de foco (deep work). A aba
  "Meeting Intelligence" tem um botão **→ Criar tarefas** que transforma as ações de
  uma reunião em tarefas automaticamente.
- **Carreira**: registre suas conquistas profissionais (Achievement Tracker) — isso
  alimenta o Career Vault (banco de evidências para currículo/entrevista) e o
  detector de desvio de carreira.
- **Vagas (Job Hunter)**: pipeline em Kanban (arraste os cards entre colunas), Fit
  Score automático comparando a vaga com seu perfil, gestão de entrevistas.
- **Inglês**: registre sessões de estudo, pratique com os simuladores (Meeting/
  Interview/Shadow English), registre erros recorrentes.
- **Estudos & Skills**: cursos e certificações, com o Skill Gap Radar mostrando onde
  o mercado pede mais do que você tem registrado.

### Inteligência
- **AI Insights**: todos os alertas e oportunidades detectados automaticamente.
- **Life Balance**: radar mostrando se alguma área da vida está desproporcional em
  relação às outras nas últimas semanas.
- **Decisões**: registre decisões importantes com contexto e revise depois se o
  resultado bateu com o esperado.
- **Dores & Oportunidades**: registre o que te incomoda recorrentemente; o sistema
  detecta tarefas repetidas e sugere o que vale automatizar.
- **Ideias**: backlog em Kanban.
- **Memória Pessoal**: fatos, preferências e aprendizados que você quer manter
  registrados.
- **CRM Pessoal**: contatos com lembrete de follow-up.

## 9. Importar dados (Import Center)

**Administração → Import Center**:

- Cada conector (Acompanha+, Portal Expansão, Pluma, Vagas) tem um botão **Importar
  dataset demo** para testar rapidamente.
- Para importar seus próprios dados, escolha o tipo de registro, selecione um arquivo
  `.json` ou `.csv`, clique em **Pré-visualizar** para conferir quantos registros
  serão importados, e depois **Confirmar importação**. Duplicados são detectados e
  ignorados automaticamente.

## 10. Exportar dados (Export Center)

**Administração → Export Center**: exporte tudo de uma vez ou escolha um módulo
específico, em JSON ou CSV.

## 11. Backup e restauração

**Administração → Backup & Restore**:

- **Exportar backup completo**: baixa um arquivo `.json` com todos os seus dados.
  Faça isso periodicamente — o sistema avisa quando o último backup tem mais de 7
  dias.
- **Restaurar backup**: envie um arquivo de backup e escolha:
  - **Merge** (recomendado): mescla com os dados atuais, sem apagar nada.
  - **Replace**: apaga tudo e substitui pelo conteúdo do backup — use com cuidado,
    o sistema pede confirmação antes.

## 12. Administração (perfil OWNER ou com permissão de Admin)

- **User Management**: criar usuários, desativar/reativar.
- **Module Manager**: ligar/desligar módulos inteiros para toda a instalação.
- **Permission Manager**: definir, por pessoa e por módulo, o nível de acesso
  (Nenhum, Ver, Criar, Editar, Excluir, Admin).
- **Privacy Manager**: ver quantos registros de cada tipo são privados/família.
- **Integration Center**: status de cada conector externo.
- **Audit Log**: histórico de tudo que foi criado/editado/excluído/importado/
  exportado no sistema, com data e responsável.
- **Data Management**: quantidade de registros por módulo, com opção de limpar um
  módulo inteiro (com confirmação), e um botão **"Apagar dados de todos os
  módulos"** (só para o Owner) que faz isso de uma vez para todos os módulos —
  usuários, permissões e configurações não são afetados. Recomendado fazer um
  backup antes (seção 11) caso queira poder desfazer.
- **System Health**: status técnico do banco de dados local e erros recentes.
- **Test Runner**: roda testes automáticos do sistema — útil para confirmar que tudo
  está funcionando após alguma mudança.

## 13. Área do Owner (somente Dielly)

- **AI Settings**: hoje o sistema usa um motor de regras local (nenhuma informação
  sai do seu computador). Esta tela já permite configurar um provedor de IA real no
  futuro.
- **Corporate Collector**: único lugar por onde dados do trabalho corporativo (Jira/
  calendário) entram no sistema — sempre passando por um filtro que remove qualquer
  informação sensível antes de salvar.

## 14. Perguntas frequentes

**Meus dados ficam salvos onde?** No seu próprio navegador (IndexedDB), não em um
servidor externo. Por isso o backup regular é importante — se limpar os dados do
navegador, os dados somem.

**Posso usar em outro computador?** Sim, mas os dados não sincronizam sozinhos entre
dispositivos ainda (fase local-first). Use Exportar/Restaurar Backup para levar seus
dados de um dispositivo para outro.

**Por que não vejo alguns módulos no menu?** Seu perfil não tem permissão para eles,
ou um Admin desativou aquele módulo para toda a instalação. Fale com quem administra
o sistema.

**Apaguei algo por engano, dá para recuperar?** Sim — peça para um Admin restaurar a
partir do backup mais recente, ou (se ainda não fez backup) avise imediatamente, pois
o registro fica marcado como excluído mas não é removido de verdade do banco local.
