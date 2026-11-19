import { prisma } from "../src/lib/prisma";
import { runDocumentHomologation } from "./homologate-document-templates";
// This entry point deliberately cannot silently revert to local storage.
runDocumentHomologation(true).then(()=>console.log("Private Blob: reinício, privacidade e limpeza de objetos e registros confirmados."))
  .catch(()=>{console.error("Homologação remota não aprovada. Confira o store de desenvolvimento, a sessão OIDC e a configuração local.");process.exitCode=1;})
  .finally(()=>prisma.$disconnect());
