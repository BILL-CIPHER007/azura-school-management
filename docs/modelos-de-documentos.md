# Modelos de documentos por escola

Em **Configurações > Documentos > Modelos**, um administrador envia um DOCX de até 1 MB. O limite cabe no corpo de 2 MB já usado pelas Server Actions, incluindo o formulário multipart. Cada envio cria um rascunho imutável. O nome e a lista de campos reconhecidos aparecem ao lado da versão.

Selecione um aluno (ou uma cobrança paga) e abra a prévia. A versão só pode ser ativada após o servidor gerar seu PDF com sucesso. Ao voltar à aba do Azura, confirme a versão e ative-a. O anterior é arquivado na mesma transação. **Restaurar padrão Azura** arquiva o ativo sem apagar o arquivo. Apenas administradores da própria escola baixam os originais. Uma escola não precisa cadastrar modelos.

## Preparação no Word

Use parágrafos normais e os campos exibidos para aquele tipo, por exemplo:

    Declaramos que {{student.name}}, matrícula {{student.registration}},
    frequenta a turma {{class.name}} no ano letivo {{academicYear.name}}.
    {{school.name}}, {{issue.date}}.

Para boletim e histórico, escreva `{{subjectsTable}}` sozinho em um parágrafo. O sistema gera uma tabela Word com cabeçalho e larguras de coluna e projeta as células no PDF com paginação e repetição de cabeçalhos. O histórico separa os anos. Notas, frequência e situação vêm dos mesmos cálculos dos PDFs padrão. No histórico, os campos de resumo fora da tabela referem-se à matrícula mais recente.

Esta versão **não reproduz o layout completo do Word**. Usa um renderer A4 em JavaScript: texto, negrito por parágrafo, centralização, tabelas acadêmicas e imagens incorporadas PNG/JPEG. Cabeçalhos e rodapés compatíveis entram no início e no final do fluxo. Fontes personalizadas, posicionamento flutuante, tabelas fixas, campos automáticos do Word, hyperlinks externos e SVG não são suportados. A imagem de assinatura é gráfica, não uma assinatura digital certificada. Revise sempre a prévia.

O recibo é emitido pela administração no plano Profissional, para cobrança paga com data de pagamento e sem reembolso concluído. No financeiro, use **Baixar recibo**. Sem modelo ativo é gerado um recibo padrão. Os portais externos não ganham essa permissão. Para os documentos acadêmicos, as políticas do Bloco 12 continuam sendo avaliadas antes da seleção do modelo.

## Armazenamento e operação

- Desenvolvimento: diretório privado `.private-documents/` (ignorado pelo Git). Em servidor persistente, configure `DOCUMENT_STORAGE_DIR` como diretório privado, fora de `public`, acessível somente pela aplicação. No modo de produção não há fallback implícito para um diretório temporário.
- Na Vercel, use exclusivamente [Vercel Private Blob com OIDC](storage-privado-documentos.md). Não há fallback para disco nem gravações em S3. Fora da Vercel, a configuração S3 legada serve apenas para leitura de originais existentes.
- Cada registro guarda metadados, SHA-256 e chave gerada no servidor. O arquivo fica fora do PostgreSQL. Não altere o backend de storage sem copiar os objetos e verificar os hashes.
- Um arquivo adulterado, ausente ou ilegível resulta no PDF padrão durante a emissão. O log técnico `template.render.fallback` informa tipo e escola, sem nomes, conteúdo ou credenciais. A prévia não utiliza esse fallback e uma falha não habilita ativação.
- Banco e storage não compartilham transação: se o estado do commit não puder ser confirmado, o código preserva o objeto para reconciliação, em vez de apagar um original potencialmente referenciado.

## Homologação local

Use PostgreSQL em loopback, sem acesso ao bucket externo. Rode `npx tsx scripts/validate-document-templates.ts`, `npm run build` e `npx tsx scripts/homologate-document-templates.ts`. A homologação usa o build standalone em porta de loopback temporária, duas escolas de teste e um diretório privado exclusivo. Faz a limpeza ao terminar. Nunca rode esses cenários contra produção.
