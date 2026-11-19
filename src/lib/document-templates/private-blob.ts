import { del, get, put } from "@vercel/blob";
import { check } from "../document-template-placeholders";
import { limit, mime } from "./docx";

export function selectedBlobStore(env: Record<string,string|undefined> = process.env) {
  const prod = env.VERCEL_ENV === "production";
  const expected = prod ? env.DOCUMENT_BLOB_PRODUCTION_STORE_ID : env.DOCUMENT_BLOB_NONPROD_STORE_ID;
  check(expected && /^store_[a-zA-Z0-9]+$/.test(expected) && env.BLOB_STORE_ID === expected &&
    (!env.DOCUMENT_BLOB_PRODUCTION_STORE_ID || env.DOCUMENT_BLOB_NONPROD_STORE_ID !== env.DOCUMENT_BLOB_PRODUCTION_STORE_ID),
    "O store privado não corresponde ao ambiente.");
  check(!env.BLOB_READ_WRITE_TOKEN && !env.VERCEL_BLOB_API_URL && !env.NEXT_PUBLIC_VERCEL_BLOB_API_URL,
    "Use a conexão OIDC do store privado.");
  return expected;
}

export async function privateBlob(method:"PUT"|"GET"|"DELETE",key:string,data?:Buffer,sdk={put,get,del}) {
  const options = {storeId:selectedBlobStore(),abortSignal:AbortSignal.timeout(10000)};
  // Only the SDK sees OIDC credentials. Paths, URLs and SDK exceptions stay off logs and responses.
  try {
    if(method==="PUT"){
      check(data && data.length>0 && data.length<=limit,"Arquivo fora do limite.");
      await sdk.put(key,data,{...options,access:"private",contentType:mime,allowOverwrite:false,addRandomSuffix:false});
    } else if(method==="DELETE"){
      await sdk.del(key,options);
    } else {
      const result=await sdk.get(key,{...options,access:"private",useCache:false});
      check(result?.statusCode===200,"Arquivo indisponível.");
      const reader=result.stream.getReader();let n=0;const parts:Buffer[]=[];
      try{
        check(result.blob.pathname===key && result.blob.contentType===mime && result.blob.size<=limit,"Metadados inválidos.");
        for(;;){const {done,value}=await reader.read();if(done)break;
          check((n+=value.length)<=limit,"Arquivo fora do limite.");parts.push(Buffer.from(value));}
        return Buffer.concat(parts,n);
      }finally{await reader.cancel().catch(()=>{});}
    }
    return Buffer.alloc(0);
  } catch {throw new Error("Não foi possível acessar o arquivo privado.");}
}
