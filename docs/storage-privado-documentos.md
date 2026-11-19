# Modelos DOCX: operação do storage privado

## Limites e autorização

O servidor inspeciona extensão, MIME, tamanho (até 1 MB), estrutura OOXML, macros, referências externas e placeholders antes de gravar. Gera a chave `schools/{schoolId}/document-templates/{type}/v{version}/{uuid}.docx`. O nome original sanitizado, MIME, tamanho, digest e chave são metadados no banco; não se persiste URL. Chaves legadas sem versão são aceitas apenas para leitura.

A requisição de download autentica o usuário e verifica papel ADMIN, escola e modelo antes de ler o objeto. A resposta envia o conteúdo com attachment e sem cache; não há signed URL nem endpoint de exclusão. No máximo 1 MB é carregado em memória para conferir tamanho e SHA-256 antes de enviar qualquer byte. A prévia lê o mesmo original, exige ADMIN e não autoriza ativação em caso de erro. A emissão autorizada pode usar o PDF padrão quando o modelo ativo falha.

## Configuração por ambiente

1. Em Vercel Storage, selecione ou crie um **Blob privado** exclusivo de homologação. Conecte-o ao projeto **somente para Development e Preview**, com OIDC. Não habilite acesso público. Confira a visibilidade no painel e os ambientes da conexão antes de qualquer gravação.
2. Configure `DOCUMENT_BLOB_NONPROD_STORE_ID` nesses ambientes com o identificador real do store. O SDK usa `BLOB_STORE_ID` e a identidade Vercel. Para o ensaio fora da Vercel, selecione o adaptador `vercel-blob` em `DOCUMENT_STORAGE_PROVIDER`, forneça apenas as variáveis de Blob de Development e um `VERCEL_OIDC_TOKEN` de Development válido ao processo. Preserve a `DATABASE_URL` **local**; não importe as demais variáveis do projeto remoto.
3. Somente na futura etapa autorizada de produção: provisionar separadamente um Blob **privado** exclusivo de Production, conectá-lo apenas a Production e configurar `DOCUMENT_BLOB_PRODUCTION_STORE_ID` com seu ID. Revisar os vínculos no painel: um ID configurado na aplicação não substitui o controle de acesso do provedor.
4. A aplicação recusa ID ausente ou divergente e `BLOB_READ_WRITE_TOKEN`. Não usar variáveis públicas, tokens estáticos, logs de debug do SDK, URLs assinadas ou armazenamento em `public/`. Fora da Vercel, arquivos de desenvolvimento ficam no diretório privado definido por `DOCUMENT_STORAGE_DIR`; não há migração automática entre backends.

## Falhas e reconciliação

A versão é alocada sob lock da escola. O PUT privado não sobrescreve e deve completar antes do INSERT do rascunho. INSERT e eventos de auditoria compartilham transação. Se o commit falhar após um PUT confirmado, remover apenas o objeto daquela tentativa, depois de confirmar que não existe registro com sua chave. Se a confirmação do PUT ou do banco for ambígua, preservar o objeto e investigar. Nunca ativar automaticamente. Arquivamento é lógico.

Se houver `template.storage.cleanup_failed` ou `template.storage.write_unconfirmed`, identificar o ambiente e comparar, em operação administrativa privada, as chaves antigas do prefixo da escola com os registros da escola. Antes de remover um órfão, descartar transações/uploads ainda em andamento e reconfirmar ausência no banco. Não apagar por idade ou prefixo em massa. Não registrar conteúdo, tokens ou URLs nos logs.

## Reproduzir

Usar somente PostgreSQL em loopback. Primeiro executar `npm run lint`, `npm run build` e `npx prisma migrate status`. Executar com `npx tsx scripts/<nome>.ts`:

- `validate-document-template-storage`: contrato do SDK simulado; não comprova privacidade no provedor.
- `homologate-document-templates`: HTTP real, PostgreSQL e disco privados locais.
- `homologate-document-template-storage`: o mesmo cenário com Blob real, OIDC, HEAD autenticado, GET anônimo negado, reinício e verificação dos objetos remanescentes por escola. Sem configuração de Development deve falhar antes de criar fixtures.
- Regressões: `validate-document-templates`, `validate-document-policies`, `validate-audit-institutional`, `validate-academic-history`, `validate-financial-core` e `validate-financial-robustness`.

Alternativa efetivamente usada no PowerShell quando o `tsx` falha com `uv_os_get_passwd` (substituir o último argumento pelo nome da suíte):

```powershell
node --env-file=.env -e "const ts=require('typescript'),fs=require('fs'),p=require('path'),M=require('module'),orig=M._resolveFilename;M._resolveFilename=function(s,...a){return orig.call(this,s.startsWith('@/')?p.resolve('src',s.slice(2)):s,...a)};require.extensions['.ts']=(m,f)=>m._compile(ts.transpile(fs.readFileSync(f,'utf8'),{module:1,target:9,esModuleInterop:true}),f);process.argv[1]=p.resolve('scripts',process.argv[1]+'.ts');M.runMain();" validate-document-template-storage
```

Teste local não libera deploy. A aprovação exige evidência de privacidade e persistência no Blob real e revisão da separação de ambientes.
