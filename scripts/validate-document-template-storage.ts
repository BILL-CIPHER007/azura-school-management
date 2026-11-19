import assert from "node:assert/strict";
import { mime, limit } from "../src/lib/document-templates/docx";
import { privateBlob, selectedBlobStore } from "../src/lib/document-templates/private-blob";
import { newKey, validKey } from "../src/lib/document-templates/storage";
import { fixtureDocx } from "./fixtures/document-template";
import type { put,get,del } from "@vercel/blob";

async function test(){
  const s="school-A",t="BOLETIM",k=newKey(s,t,1),k2=newKey(s,t,2);
  assert.ok(k.includes("/v1/")&&k2.includes("/v2/")&&k!==k2);
  assert.ok(validKey(s,t,k,1));for(const [school,type,key,version] of [["school-B",t,k,1],[s,"RECIBO",k,1],[s,t,k,2],[s,t,k+"/extra",1],[s,t,"../"+k,1]] as const)assert.equal(validKey(school,type,key,version),false);
  const legacy=k.replace("/v1/","/");assert.ok(validKey(s,t,legacy,1,true));assert.ok(!validKey(s,t,legacy,1));
  const env={BLOB_STORE_ID:"store_qa",DOCUMENT_BLOB_NONPROD_STORE_ID:"store_qa",DOCUMENT_BLOB_PRODUCTION_STORE_ID:"store_prod"};
  assert.equal(selectedBlobStore(env),"store_qa");
  assert.throws(()=>selectedBlobStore({...env,VERCEL_ENV:"production"}));
  assert.throws(()=>selectedBlobStore({...env,DOCUMENT_BLOB_PRODUCTION_STORE_ID:"store_qa"}));
  assert.throws(()=>selectedBlobStore({...env,BLOB_READ_WRITE_TOKEN:"mock"}));
  // Contract test only: no network or real secrets. Real OIDC runs in the separate homologation.
  const remembered={...process.env};
  try{
    Object.assign(process.env,env);delete process.env.VERCEL_ENV;delete process.env.BLOB_READ_WRITE_TOKEN;
    const bytes=fixtureDocx(["{{student.name}}"]), objects=new Map<string,Buffer>();
    const fake={
      put:async(path:string,b:Buffer,o:Record<string,unknown>)=>{
        assert.equal(o.access,"private");assert.equal(o.contentType,mime);assert.equal(o.allowOverwrite,false);assert.equal(o.addRandomSuffix,false);assert.equal(o.storeId,"store_qa");
        if(objects.has(path))throw Error("exists");objects.set(path,b);
      },
      get:async(path:string,o:Record<string,unknown>)=>{
        assert.equal(o.access,"private");assert.equal(o.useCache,false);const b=objects.get(path);if(!b)return null;
        return {statusCode:200,blob:{pathname:path,contentType:mime,size:b.length},stream:new Response(new Uint8Array(b)).body};
      },
      del:async(path:string)=>{objects.delete(path);}
    } as unknown as {put:typeof put;get:typeof get;del:typeof del};
    await privateBlob("PUT",k,bytes,fake);await assert.rejects(privateBlob("PUT",k,bytes,fake));
    assert.deepEqual(await privateBlob("GET",k,undefined,fake),bytes);
    await assert.rejects(privateBlob("PUT",k2,Buffer.alloc(limit+1),fake));
    await privateBlob("DELETE",k,undefined,fake);await assert.rejects(privateBlob("GET",k,undefined,fake));assert.equal(objects.size,0);
  }finally{for(const name of [...Object.keys(env),"BLOB_READ_WRITE_TOKEN","VERCEL_ENV"]){if(remembered[name]===undefined)delete process.env[name];else process.env[name]=remembered[name];}}
  console.log("Contrato privado, autenticação por ambiente, chaves, metadata, limite, ausência e limpeza: OK (SDK simulado).");
}
test().catch(e=>{console.error(e.message);process.exitCode=1;});
