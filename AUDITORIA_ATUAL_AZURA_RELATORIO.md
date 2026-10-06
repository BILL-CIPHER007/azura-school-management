# Auditoria atual do Azura - Relatorio tecnico

Data da auditoria: 05/10/2026
Escopo: leitura estatica do projeto em `D:\Projetos\azura`, sem alteracao de schema, produto, banco ou landing page.

## 1. Resumo executivo

O Azura ja possui mecanismos reais de rastreabilidade, mas eles ainda nao formam uma auditoria completa de nivel institucional para todas as areas do sistema.

Hoje existem quatro familias de registro:

- `AuditLog`: trilha administrativa/acadêmica basica, com escola, usuario, acao, entidade, id da entidade e data/hora.
- `ChargeFinancialEvent`: historico financeiro por cobranca, com origem, usuario quando houver, status anterior/proximo, status externo anterior/proximo, mensagem e evento externo.
- `CollectionAction`: historico de cobranca/inadimplencia, incluindo contato, promessa, observacao, e-mail, destinatario, status de entrega, provedor e usuario responsavel.
- `BillingAutomationRun` e `AsaasWebhookEvent`: historicos tecnicos/de dominio para automacao e webhooks.

A area financeira e a mais madura em rastreabilidade. Ela registra uma linha de tempo util para operacao: cobrancas criadas, alteradas, pagas, canceladas, conciliadas, emitidas no Asaas, reembolsos, webhooks, contatos, promessas e e-mails.

A area academica e administrativa tem auditoria parcial. Notas, frequencia, diario de classe, fechamento de periodo/ano, matricula, importacao CSV, criacao/edicao de responsavel e atribuicoes professor-turma-disciplina registram um evento no `AuditLog`, mas o registro central nao guarda valores anteriores e novos. Portanto, ele responde "quem fez uma acao e quando", mas geralmente nao responde "o que exatamente mudou de X para Y".

Nao foi encontrada uma auditoria completa de login/logout, downloads/emissao de documentos PDF, edicao detalhada de alunos/professores/turmas, criacao de comunicados/eventos ou alteracoes com before/after em nivel de campo.

Classificacao de maturidade geral atual: **2 de 4**.

Interpretação da nota:

- 0: sem registros relevantes.
- 1: registros tecnicos ou pontuais.
- 2: auditoria basica por entidade/acao, sem before/after amplo.
- 3: auditoria funcional com before/after e cobertura ampla.
- 4: auditoria institucional robusta, imutavel, pesquisavel, com politicas de retencao, exportacao e evidencias completas.

O Azura esta acima de um MVP sem trilha, especialmente no financeiro, mas ainda nao deve ser apresentado comercialmente como sistema com auditoria completa ou trilha detalhada de todas as alteracoes.

## 2. Mecanismos encontrados

### 2.1. AuditLog

Modelo: `prisma/schema.prisma`, `model AuditLog`.

Campos existentes:

- `id`
- `schoolId`
- `userId`
- `action`
- `entity`
- `entityId`
- `createdAt`

Relacoes:

- `school` com `onDelete: Cascade`
- `user` com `onDelete: SetNull`

Tipo de mecanismo: **A - auditoria administrativa basica**.

Pontos fortes:

- Sempre vincula a escola.
- Quando a acao parte de usuario autenticado, vincula `userId`.
- Fica visivel no Admin em Configuracoes, na secao "Auditoria", com ultimos 20 registros.
- E simples, legivel e de baixo custo.

Limites:

- Nao guarda `before`.
- Nao guarda `after`.
- Nao guarda `metadata`.
- Nao guarda IP, user-agent, origem da requisicao ou motivo da alteracao.
- Nao possui protecao de imutabilidade no modelo.
- Pode ser removido por cascade se a escola for excluida.
- A interface lista apenas os ultimos registros; nao ha busca, filtro, exportacao ou tela detalhada de auditoria.

### 2.2. ChargeFinancialEvent

Modelo: `prisma/schema.prisma`, `model ChargeFinancialEvent`.

Campos relevantes:

- `schoolId`
- `chargeId`
- `userId`
- `source` (`ADMIN`, `WEBHOOK`, `RECONCILIATION`, `SYSTEM`)
- `action`
- `previousStatus`
- `nextStatus`
- `previousExternalStatus`
- `nextExternalStatus`
- `message`
- `externalEventId`
- `createdAt`

Tipo de mecanismo: **B - historico de dominio financeiro** e **C - evento externo** quando a origem e webhook/Asaas.

Pontos fortes:

- Registra transicoes financeiras importantes.
- Diferencia origem manual, webhook, conciliacao e sistema.
- Mantem status interno e externo anterior/proximo quando aplicavel.
- E exibido no Admin Financeiro em "Historico" por cobranca.
- Tambem aparece resumido no portal do responsavel.

Limites:

- E especifico de cobrancas; nao cobre dados academicos.
- O campo `message` e limitado a 240 caracteres.
- Nao guarda snapshot completo da cobranca antes/depois.
- Depende da cobranca; a relacao com `Charge` usa cascade.

### 2.3. CollectionAction

Modelo: `prisma/schema.prisma`, `model CollectionAction`.

Campos relevantes:

- `schoolId`
- `chargeId`
- `type`
- `channel`
- `communicationType`
- `messageTemplate`
- `messageBody`
- `deliveryStatus`
- `provider`
- `providerMessageId`
- `sentAt`
- `deliveryError`
- `recipient`
- `subject`
- `note`
- `promisedDate`
- `promiseStatus`
- `createdById`
- `createdAt`

Tipo de mecanismo: **B - historico de dominio de cobranca/comunicacao**.

Pontos fortes:

- Registra contato manual, observacao, promessa de pagamento e comunicacao por e-mail.
- Guarda canal, destinatario, assunto, corpo da mensagem, status de entrega e erro sanitizado.
- Vincula usuario criador quando existe.
- Aparece na pagina de Inadimplencia como historico por cobranca.

Limites:

- Pode armazenar conteudo sensivel no corpo da mensagem e observacoes.
- Nao tem regra de retencao visivel.
- Nao e uma auditoria geral; e historico operacional de cobranca.
- Relacao com cobranca usa cascade.

### 2.4. BillingAutomationRun

Modelo: `prisma/schema.prisma`, `model BillingAutomationRun`.

Campos relevantes:

- `schoolId`
- `billingRuleId`
- `competence`
- `trigger` (`CRON`, `MANUAL`)
- `status` (`SUCCESS`, `SKIPPED`, `FAILED`)
- contadores de elegiveis, geradas, existentes e puladas
- `errorMessage`
- `triggeredById`
- `createdAt`

Tipo de mecanismo: **B - historico de dominio** e **D - log tecnico de automacao**.

Pontos fortes:

- Permite rastrear execucoes de automacao de mensalidades.
- Diferencia execucao manual e cron.
- Guarda resultados agregados.

Limites:

- Nao registra snapshot completo dos alunos/cobrancas avaliados.
- Nao substitui auditoria individual das cobrancas geradas.

### 2.5. AsaasWebhookEvent

Modelo: `prisma/schema.prisma`, `model AsaasWebhookEvent`.

Campos relevantes:

- `externalEventId`
- `eventType`
- `externalPaymentId`
- `receivedAt`
- `processedAt`
- `processingError`

Tipo de mecanismo: **C - evento externo** e **D - log tecnico de integracao**.

Pontos fortes:

- Evita duplicidade por `externalEventId` unico.
- Guarda recebimento, processamento e erro.
- Permite diagnosticar webhook recebido mas nao processado.

Limites:

- Nao guarda payload completo.
- Nao vincula diretamente `schoolId` no proprio modelo.
- Nao e exibido em uma tela administrativa propria.

## 3. Cobertura por area

Legenda da coluna "Auditada?":

- **SIM**: ha registro persistido suficiente para rastrear a acao principal.
- **PARCIAL**: ha registro, mas faltam dados importantes, como before/after, detalhe de campo, tela, ou cobertura de todos os fluxos.
- **NAO**: nao foi encontrado registro persistido especifico para a acao.

| Area | Acao | Auditada? | Usuario | Tenant | Antes/Depois | Origem | Historico visivel? |
|---|---|---:|---:|---:|---:|---|---:|
| Usuarios/identidade | Login | NAO | NAO | NAO | NAO | Nao identificado | NAO |
| Usuarios/identidade | Logout | NAO | NAO | NAO | NAO | `cookieStore.delete` sem log | NAO |
| Usuarios/identidade | Criacao de usuario por matricula | PARCIAL | SIM | SIM | NAO | `AuditLog` em matricula | PARCIAL |
| Usuarios/identidade | Criacao de usuario por responsavel | PARCIAL | SIM | SIM | NAO | `AuditLog` em responsavel | PARCIAL |
| Usuarios/identidade | Alteracao de e-mail/nome de responsavel | PARCIAL | SIM | SIM | NAO | `AuditLog guardian.updated` | PARCIAL |
| Alunos | Criacao via matricula manual | PARCIAL | SIM | SIM | NAO | `AuditLog enrollment.created` | PARCIAL |
| Alunos | Criacao via importacao CSV | PARCIAL | SIM | SIM | NAO | `AuditLog student_import.enrollment_created` e `student_import.completed` | PARCIAL |
| Alunos | Edicao cadastral direta | NAO | NAO | NAO | NAO | Nao identificado | NAO |
| Alunos | Visualizacao de detalhe | NAO | NAO | SIM | NAO | Consulta normal | NAO |
| Responsaveis | Criacao direta | PARCIAL | SIM | SIM | NAO | `AuditLog guardian.created` | PARCIAL |
| Responsaveis | Edicao de nome/CPF/e-mail/telefone | PARCIAL | SIM | SIM | NAO | `AuditLog guardian.updated` | PARCIAL |
| Responsaveis | Vinculo responsavel/aluno criado na matricula | PARCIAL | SIM | SIM | NAO | Indireto por `enrollment.created` | PARCIAL |
| Responsaveis | Alteracao de parentesco/vinculo | NAO | NAO | NAO | NAO | Nao identificado | NAO |
| Professores | Listagem/detalhe | NAO | NAO | SIM | NAO | Consulta normal | NAO |
| Professores | Cadastro/edicao cadastral direta | NAO | NAO | NAO | NAO | Nao identificado no codigo atual | NAO |
| Professores | Atribuir turma/disciplina | PARCIAL | SIM | SIM | NAO | `AuditLog teacher_assignment.created` | PARCIAL |
| Professores | Remover atribuicao | PARCIAL | SIM | SIM | NAO | `AuditLog teacher_assignment.deleted` | PARCIAL |
| Matriculas | Criar matricula | PARCIAL | SIM | SIM | NAO | `AuditLog enrollment.created` | PARCIAL |
| Matriculas | Importar CSV | PARCIAL | SIM | SIM | NAO | `AuditLog student_import.completed` | PARCIAL |
| Matriculas | Alterar status/turma | NAO | NAO | NAO | NAO | Nao identificado | NAO |
| Turmas | Listar/detalhar | NAO | NAO | SIM | NAO | Consulta normal | NAO |
| Turmas | Criar/editar/excluir | NAO | NAO | NAO | NAO | Nao identificado no fluxo atual | NAO |
| Turmas | Ver diario/frequencia/notas | NAO | NAO | SIM | NAO | Consulta normal | NAO |
| Disciplinas | Criar disciplina | NAO | NAO | SIM | NAO | `subject.create` sem `AuditLog` | NAO |
| Disciplinas | Editar/excluir disciplina | NAO | NAO | NAO | NAO | Nao identificado | NAO |
| Atribuicoes | Professor + turma + disciplina | PARCIAL | SIM | SIM | NAO | `AuditLog` | PARCIAL |
| Notas | Lancar/editar notas | PARCIAL | SIM | SIM | NAO | `AuditLog grade.upserted` por aluno | PARCIAL |
| Frequencia | Registrar/editar chamada | PARCIAL | SIM | SIM | NAO | `AuditLog attendance.upserted` por aluno | PARCIAL |
| Diario de classe | Criar/editar registro | PARCIAL | SIM | SIM | NAO | `AuditLog class_diary.upserted` | PARCIAL |
| Calendario | Criar evento | NAO | NAO | SIM | NAO | `calendarEvent.create` sem `AuditLog` | NAO |
| Comunicados | Criar comunicado | NAO | NAO | SIM | NAO | `announcement.create` sem `AuditLog` | NAO |
| Documentos/PDF | Emitir boletim | NAO | NAO | SIM | NAO | Rota gera PDF sem log | NAO |
| Documentos/PDF | Emitir declaracao de matricula | NAO | NAO | SIM | NAO | Rota gera PDF sem log | NAO |
| Documentos/PDF | Emitir historico escolar | NAO | NAO | SIM | NAO | Rota gera PDF sem log | NAO |
| Configuracoes | Fechar periodo | PARCIAL | SIM | SIM | NAO | `AuditLog academic_period.closed` | PARCIAL |
| Configuracoes | Reabrir periodo | PARCIAL | SIM | SIM | NAO | `AuditLog academic_period.reopened` | PARCIAL |
| Configuracoes | Encerrar ano letivo | PARCIAL | SIM | SIM | NAO | `AuditLog academic_year.closed` | PARCIAL |
| Configuracoes | Alterar plano/regra academica | NAO | NAO | NAO | NAO | Nao identificado | NAO |
| Financeiro | Criar cobranca | SIM | SIM | SIM | PARCIAL | `AuditLog` + `ChargeFinancialEvent` | SIM |
| Financeiro | Editar cobranca interna | SIM | SIM | SIM | PARCIAL | `AuditLog` + `ChargeFinancialEvent` | SIM |
| Financeiro | Marcar como paga manualmente | SIM | SIM | SIM | PARCIAL | `AuditLog` + `ChargeFinancialEvent` | SIM |
| Financeiro | Cancelar cobranca | SIM | SIM | SIM | PARCIAL | `AuditLog` + `ChargeFinancialEvent` | SIM |
| Financeiro | Emitir Pix/Boleto Asaas | SIM | SIM | SIM | PARCIAL | `AuditLog` + `ChargeFinancialEvent` | SIM |
| Financeiro | Conciliar com Asaas | SIM | SIM | SIM | PARCIAL | `AuditLog` + `ChargeFinancialEvent` | SIM |
| Financeiro | Solicitar reembolso | SIM | SIM | SIM | PARCIAL | `AuditLog` + `ChargeFinancialEvent` | SIM |
| Financeiro | Webhook Asaas recebido/processado | SIM | PARCIAL | PARCIAL | PARCIAL | `AsaasWebhookEvent` + `ChargeFinancialEvent` | PARCIAL |
| Financeiro | Contato/observacao/promessa de inadimplencia | SIM | SIM | SIM | PARCIAL | `CollectionAction` + `ChargeFinancialEvent` | SIM |
| Financeiro | E-mail de cobranca enviado/falhou | SIM | SIM | SIM | PARCIAL | `CollectionAction` + `ChargeFinancialEvent` | SIM |
| Mensalidades | Criar/editar regra | PARCIAL | SIM | SIM | NAO | `AuditLog billing_rule.created/updated` | PARCIAL |
| Mensalidades | Gerar lote | PARCIAL | SIM | SIM | NAO | `AuditLog billing_batch.generated` | PARCIAL |
| Mensalidades | Automacao controlada | SIM | SIM/PARCIAL | SIM | NAO | `BillingAutomationRun` | PARCIAL |

## 4. Perguntas objetivas de rastreabilidade

### 4.1. E possivel saber qual professor alterou qual nota, de quanto para quanto?

**Parcialmente.**

O sistema registra `grade.upserted` no `AuditLog` com `schoolId`, `userId`, entidade `Grade`, `entityId` e data/hora. Como a action exige sessao de professor, o `userId` identifica o professor autenticado. O registro aponta para o `Grade` afetado.

Porem, o `AuditLog` nao guarda os valores anteriores e novos de `av1`, `av2`, `assignment` ou `average`. Assim, hoje e possivel saber que uma nota foi registrada/alterada por um usuario em determinado registro, mas nao e possivel saber somente pelo log se mudou de 6.0 para 8.0, nem qual campo mudou.

Resposta comercial segura: "o sistema registra eventos de lancamento de notas por usuario".

Resposta que ainda nao deve ser usada: "o sistema mostra toda alteracao de nota com valor anterior e novo".

### 4.2. E possivel saber quem alterou uma frequencia?

**Parcialmente.**

`attendance.upserted` e registrado no `AuditLog` com usuario, escola, entidade e registro afetado. Isso permite identificar que houve registro/alteracao de frequencia.

Porem, nao ha before/after do status. O sistema nao registra se o aluno mudou de `PRESENT` para `ABSENT`, por exemplo. Tambem registra por aluno, nao como uma chamada agrupada no modelo central.

### 4.3. E possivel saber quem alterou o diario de classe?

**Parcialmente.**

`class_diary.upserted` e registrado no `AuditLog`, com usuario e entidade `ClassDiaryEntry`.

Porem, nao ha conteudo anterior, conteudo novo, observacao anterior ou observacao nova no log. A tabela `ClassDiaryEntry` guarda apenas o estado atual.

### 4.4. E possivel saber quem alterou dados de responsavel?

**Parcialmente.**

A edicao de responsavel chama `updateGuardianRecord`, que atualiza `Guardian` e, quando existe, o `User` vinculado. A transacao registra `guardian.updated` no `AuditLog`, com `actorUserId`.

Porem, nao ha before/after de nome, CPF, e-mail ou telefone. Tambem nao ha historico especifico dos dados sensiveis alterados.

### 4.5. E possivel saber quem mudou matricula, turma ou status?

**Parcialmente para criacao; nao para mudancas posteriores.**

A criacao de matricula registra `enrollment.created`. A importacao CSV registra `student_import.enrollment_created` e `student_import.completed`.

Nao foi identificado fluxo atual de alteracao posterior de turma/status de matricula com log. Se essa alteracao for adicionada no futuro, ainda precisara registrar before/after para ser auditavel em nivel institucional.

### 4.6. E possivel saber quem mudou cadastro de aluno ou professor?

**Nao de forma completa.**

A criacao do aluno pela matricula fica indiretamente registrada pelo log de matricula. Nao foi encontrado fluxo de edicao cadastral direta do aluno com `AuditLog`.

Para professor, o sistema lista e detalha professores e gerencia atribuicoes. A auditoria cobre atribuicoes professor-turma-disciplina, mas nao foi identificado CRUD cadastral completo de professor com auditoria de dados pessoais/status.

## 5. Multi-tenant e isolamento por escola

O desenho atual e consistentemente orientado por `schoolId`:

- `School` e raiz de usuarios, alunos, responsaveis, professores, matriculas, turmas, disciplinas, notas, frequencias, comunicados, eventos, financeiro e auditoria.
- `AuditLog`, `ChargeFinancialEvent`, `CollectionAction`, `BillingAutomationRun` e a maioria dos modelos de dominio possuem `schoolId`.
- As consultas sensiveis normalmente filtram por `schoolId`.
- A pagina de Configuracoes busca `auditLog.findMany({ where: { schoolId } })`.
- A edicao de responsavel exige `{ id, schoolId }`.
- Criacao de matricula, notas, frequencia e diario validam o escopo da escola.

Riscos e observacoes:

- `AsaasWebhookEvent` nao tem `schoolId`; o evento tecnico e relacionado ao pagamento externo e so chega na escola depois de localizar `Charge.externalPaymentId`.
- `AuditLog` usa `onDelete: Cascade` com escola. Para auditoria comercial/forense, logs normalmente nao deveriam desaparecer junto com entidades operacionais sem politica explicita.
- Em `AuditLog`, a relacao com `User` e `SetNull`; isso preserva o evento, mas perde vinculo relacional se o usuario for excluido. O log nao guarda snapshot textual do nome/e-mail do ator.

Conclusao multi-tenant: **bom isolamento operacional**, mas **auditoria ainda nao e imutavel nem independente do ciclo de vida da escola/usuario**.

## 6. Before/after e granularidade

O principal ponto fraco da auditoria atual e a ausencia de before/after no `AuditLog`.

### O que existe hoje

- `ChargeFinancialEvent` tem before/after parcial para status interno e status externo.
- `CollectionAction` guarda conteudo de comunicacao/observacao no momento do registro.
- `BillingAutomationRun` guarda resumo agregado da execucao.
- `AuditLog` guarda somente evento, entidade e ator.

### O que nao existe hoje

- Snapshot anterior e novo para dados cadastrais.
- Valores anteriores e novos de notas.
- Status anterior e novo de frequencia no log central.
- Conteudo anterior e novo do diario de classe.
- Alteracoes campo a campo de cobrancas, mensalidades, responsaveis, alunos, turmas, disciplinas ou configuracoes.
- Motivo/justificativa obrigatoria para alteracoes sensiveis.

Conclusao: atualmente a auditoria central e mais uma trilha de eventos do que uma auditoria de alteracoes campo a campo.

## 7. Dados sensiveis

### Pontos positivos

- `AuditLog` central nao armazena CPF, e-mail, telefone, conteudo de mensagens ou notas diretamente.
- O servico de e-mail sanitiza erros de provedor para evitar vazamento de termos como key/token/secret/authorization.
- Mensagens de cobranca passam por validacao de privacidade em `assertCollectionMessagePrivacy`.
- Historico financeiro mascara o e-mail em algumas mensagens de evento.

### Pontos de atencao

- `CollectionAction` armazena `recipient`, `subject`, `messageBody`, `note` e `deliveryError`. Isso e correto para historico de cobranca, mas e sensivel.
- `CollectionAction.messageBody` pode conter texto enviado ao responsavel; precisa de politica de retencao e acesso.
- Nao foi encontrada politica explicita de expiracao/arquivamento de logs sensiveis.
- Nao ha classificacao de acesso separada para auditoria sensivel.

Conclusao: o `AuditLog` central e conservador com dados sensiveis, mas a area de cobranca guarda dados operacionais sensiveis e deve ser tratada como historico financeiro/comunicacional protegido.

## 8. Imutabilidade, exclusao e retencao

### Imutabilidade

Nao ha garantia tecnica forte de imutabilidade dos logs. Os modelos nao impedem update/delete por design, e nao foram encontradas protecoes especificas como trigger, tabela append-only, permissao separada ou checksum.

### Exclusao/cascade

- `AuditLog.school` usa `onDelete: Cascade`.
- `ChargeFinancialEvent.school` usa `onDelete: Cascade`.
- `ChargeFinancialEvent.charge` usa `onDelete: Cascade`.
- `CollectionAction.school` usa `onDelete: Cascade`.
- `CollectionAction.charge` usa `onDelete: Cascade`.
- `BillingAutomationRun.school` usa `onDelete: Cascade`.

Isso e aceitavel para ambiente de produto em evolucao, mas nao sustenta promessa de auditoria permanente/forense.

### Retencao

Nao foi encontrada politica tecnica de retencao, expurgo, arquivamento ou exportacao.

Conclusao: os registros existem, mas ainda devem ser considerados historicos operacionais, nao trilha imutavel de compliance.

## 9. Visibilidade administrativa

### Visivel hoje

- Configuracoes > Auditoria: mostra ultimas 20 acoes do `AuditLog`, com acao, usuario, entidade, id curto e data/hora.
- Admin Financeiro > Historico: mostra `financialEvents` por cobranca.
- Admin Financeiro > Inadimplencia > Historico: mostra `collectionActions` por cobranca.
- Responsavel > Financeiro: mostra historico financeiro resumido da propria cobranca.
- Mensalidades: exibe ultimas execucoes de automacao de forma operacional.

### Nao visivel hoje

- Tela global de auditoria com filtros por periodo, usuario, entidade e acao.
- Detalhe de log com contexto da entidade.
- Visualizacao de `AsaasWebhookEvent` bruto.
- Busca/exportacao dos logs.
- Antes/depois por campo.
- Auditoria de documentos emitidos.

Conclusao: existe visibilidade basica para administracao e boa visibilidade operacional no financeiro, mas nao ha modulo de auditoria completo.

## 10. Area financeira em detalhe

A area financeira e a que mais se aproxima de uma trilha completa de eventos.

### Coberto com boa qualidade

- Criacao de cobranca.
- Atualizacao de cobranca interna.
- Marcacao manual como paga.
- Cancelamento interno.
- Criacao de pagamento externo Asaas.
- Falha de criacao externa.
- Cancelamento externo.
- Conciliacao individual.
- Solicitar reembolso.
- Bloqueio/falha/aceite de reembolso.
- Recebimento/processamento de webhook Asaas.
- Criacao/edicao de regra de mensalidade.
- Geracao de lote.
- Emissao Pix/Boleto em lote.
- Automacao recorrente.
- Contato, observacao, promessa e e-mail de cobranca.

### O que torna a area financeira mais forte

- Usa `AuditLog` para marco administrativo.
- Usa `ChargeFinancialEvent` para linha do tempo por cobranca.
- Usa `CollectionAction` para comunicacao e inadimplencia.
- Usa `AsaasWebhookEvent` para idempotencia/processamento tecnico.
- Usa `BillingAutomationRun` para execucao de automacoes.

### Lacunas financeiras

- Snapshot completo de cobranca antes/depois nao existe.
- `AsaasWebhookEvent` nao guarda payload completo nem `schoolId` proprio.
- Eventos dependem de relacoes com cascade.
- Automacao guarda resumo, nao lista completa de decisoes por aluno.
- Alguns textos ainda usam mensagens internas como "Asaas Sandbox" em eventos antigos/codigo; isso e mais de copy/homologacao do que auditoria, mas pode aparecer em historico.

Maturidade financeira atual: **3 de 4** como historico operacional; **2 de 4** como auditoria imutavel/compliance.

## 11. Area academica em detalhe

### Notas

`saveGrades` faz `grade.upsert` por aluno e cria `AuditLog` com `grade.upserted`.

Cobertura: **PARCIAL**.

O log identifica ator, escola, entidade e horario. Nao identifica valores alterados.

### Frequencia

`saveAttendance` faz `attendance.upsert` por aluno e cria `AuditLog` com `attendance.upserted`.

Cobertura: **PARCIAL**.

O historico de chamadas na tela do professor mostra registros atuais agrupados por data/disciplina, mas isso e leitura da tabela `Attendance`, nao trilha de alteracao.

### Diario de classe

`saveClassDiaryEntry` faz `classDiaryEntry.upsert` e cria `AuditLog` com `class_diary.upserted`.

Cobertura: **PARCIAL**.

Nao ha before/after do conteudo ou observacoes.

### Fechamento academico

Fechar periodo, reabrir periodo e fechar ano letivo criam `AuditLog`.

Cobertura: **PARCIAL**.

O proprio estado `closedAt` e persistido em `AcademicPeriod`/`AcademicYear`, mas nao ha metadata de contexto no log, como nome do periodo, pendencias calculadas na hora, ou motivo.

Maturidade academica atual: **2 de 4**.

## 12. Cadastros administrativos

### Matriculas e importacao CSV

A criacao de matricula manual passa por `createEnrollmentRegistrationInTransaction` e registra `enrollment.created`.

A importacao CSV chama o mesmo fluxo com `auditAction: student_import.enrollment_created` e depois registra `student_import.completed`.

Cobertura: **PARCIAL**.

Bom ponto: ha reutilizacao do fluxo de matricula e registro da acao.

Limite: nao ha detalhes por campo no log e o registro central nao guarda quantidades/arquivo/origem alem do evento simples.

### Responsaveis

Criacao e edicao geram `AuditLog`.

Cobertura: **PARCIAL**.

Limite: sem before/after de dados sensiveis.

### Professores, alunos, turmas e disciplinas

A auditoria cobre atribuicoes de professor a turma/disciplina, mas nao foi identificado CRUD completo auditado para todas as entidades cadastrais. Criacao de disciplina aparece sem `AuditLog`.

Cobertura: **NAO/PARCIAL**, dependendo do fluxo.

Maturidade administrativa geral: **1 a 2 de 4**.

## 13. Comunicados, calendario e documentos

### Comunicados

`createAnnouncement` cria comunicado com `authorId`, `schoolId`, audiencia e turma opcional.

Cobertura de autoria do comunicado: **PARCIAL**, porque o proprio comunicado guarda autor.

Cobertura de auditoria: **NAO**, porque nao cria `AuditLog`.

### Calendario

`createCalendarEvent` cria evento com `schoolId`, ano letivo, tipo, data e horarios opcionais.

Cobertura: **NAO** para auditoria, apesar de haver escopo por escola.

### Documentos/PDF

A rota `/api/documentos/[tipo]` valida sessao, perfil, aluno permitido e gera PDF.

Cobertura: **NAO** para auditoria de emissao/download.

Isto significa que hoje nao ha trilha de quem emitiu um boletim, declaracao de matricula ou historico escolar, nem data/hora da emissao persistida.

## 14. Maturidade por area

| Area | Maturidade | Justificativa |
|---|---:|---|
| Financeiro/cobrancas | 3 | Historico de dominio robusto, eventos internos/externos e comunicacao registrada; falta imutabilidade e snapshot completo. |
| Inadimplencia/comunicacao | 3 | Registra contatos, promessas, e-mails, status de entrega e ator; exige politica de retencao/acesso. |
| Automacao de mensalidades | 2 | Guarda execucoes e contadores; nao guarda detalhe completo de cada decisao. |
| Fechamento academico | 2 | Registra eventos de fechamento/reabertura; sem metadata/before-after. |
| Notas | 2 | Registra que houve upsert por usuario; sem valores anteriores/novos. |
| Frequencia | 2 | Registra que houve upsert por usuario; sem status anterior/novo. |
| Diario de classe | 2 | Registra evento; sem conteudo antes/depois. |
| Matriculas | 2 | Criacao e importacao registradas; sem before/after/detalhes. |
| Responsaveis | 2 | Criacao/edicao registradas; sem before/after. |
| Atribuicoes professor/turma/disciplina | 2 | Cria/remove com log; sem detalhes expandidos no log. |
| Comunicados | 1 | Autor fica no proprio registro; sem auditoria separada. |
| Calendario | 1 | Escopo por escola, mas sem log de criacao/edicao. |
| Documentos/PDF | 0 | Emissao/download nao gera registro persistido. |
| Login/logout | 0 | Nao ha registro persistido. |
| Auditoria global/admin | 1 | Secao simples com ultimos 20 logs; sem filtros/detalhes/exportacao. |

## 15. Principais lacunas por prioridade

### Prioridade alta

1. **Adicionar before/after estruturado ao AuditLog**
   - Especialmente para notas, frequencia, diario, responsaveis, matriculas e financeiro.
   - Pode ser JSON com campos alterados, evitando dados excessivos.

2. **Auditar emissao de documentos oficiais**
   - Boletim, declaracao de matricula e historico escolar devem registrar emissor, perfil, aluno, tipo de documento, data/hora e escola.

3. **Criar tela administrativa de auditoria completa**
   - Filtros por periodo, usuario, entidade, acao e busca por entidade.
   - Detalhe do evento.
   - Exportacao controlada.

4. **Proteger logs contra perda acidental**
   - Rever cascades nos modelos de auditoria/historico.
   - Definir politica de retencao.
   - Considerar append-only por convencao de servico e/ou restricao tecnica.

### Prioridade media

5. **Registrar login/logout e tentativas falhas**
   - Com cuidado para nao expor dados sensiveis.
   - Registrar escola, usuario quando conhecido, sucesso/falha, timestamp e origem tecnica limitada.

6. **Auditar comunicados e calendario**
   - Criacao, edicao e cancelamento/remocao quando existirem.
   - Incluir publico, turma e data como metadata.

7. **Expandir auditoria de cadastros**
   - Aluno, professor, turma, disciplina, responsavel e matricula com before/after seletivo.

8. **Melhorar rotulos de auditoria**
   - `admin-labels.ts` ainda rotula apenas algumas acoes antigas; varias acoes novas aparecem como chave tecnica se exibidas.

### Prioridade baixa

9. **Adicionar motivo/observacao em alteracoes criticas**
   - Exemplo: reabrir periodo, alterar nota depois do fechamento, cancelar cobranca, editar dados sensiveis.

10. **Separar auditoria tecnica de auditoria de negocio**
   - Webhook bruto, automacoes e eventos de dominio podem ter telas/retencoes diferentes.

## 16. Frases comerciais

### Frase comercial permitida hoje

> O Azura registra eventos importantes da rotina escolar e financeira por escola e usuario, incluindo lancamentos academicos, fechamento de periodos, matriculas, alteracoes de responsaveis, atribuicoes docentes e uma linha do tempo financeira com cobrancas, comunicacoes, conciliacoes e webhooks.

### Frase comercial que NAO deve ser usada ainda

> O Azura possui auditoria completa e imutavel de todas as alteracoes do sistema, com valores anteriores e novos, rastreabilidade detalhada por campo, historico de emissao de documentos e logs completos de acesso.

## 17. Conclusao

O estado atual do Azura e adequado para demonstrar rastreabilidade operacional basica e historico financeiro consistente. A arquitetura ja tem bons pontos de apoio: `schoolId` em quase todos os modelos, `userId` nos eventos principais, logs visiveis em Configuracoes e historicos financeiros por cobranca.

Ainda assim, para uma entrega comercial com promessa forte de auditoria, faltam tres pilares: before/after, cobertura universal das acoes sensiveis e imutabilidade/retencao. A recomendacao e tratar a auditoria atual como **auditoria basica + historico financeiro robusto**, e planejar uma fase especifica de **auditoria institucional** antes de vender o sistema como compliance completo.
