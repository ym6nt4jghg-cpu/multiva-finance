import {adminClient} from '@/lib/supabase/server';import {limitedBody} from '@/lib/http';import {verifyCakto} from '@/lib/integrations/signatures';import {parseCakto} from '@/lib/integrations/cakto';
export async function POST(req:Request){if(process.env.CAKTO_ENABLED!=='true'||!process.env.CAKTO_WEBHOOK_SECRET)return Response.json({error:'Integração não ativada.'},{status:503});try{
 const raw=await limitedBody(req,262144);if(!verifyCakto(raw,req.headers.get('x-cakto-timestamp'),req.headers.get('x-cakto-signature'),process.env.CAKTO_WEBHOOK_SECRET))return Response.json({error:'Assinatura inválida.'},{status:401});
 const jobs=parseCakto(JSON.parse(raw));if(jobs.length){const {error}=await adminClient().from('webhook_jobs').upsert(jobs.map(j=>({...j,provider:'cakto'})),{onConflict:'provider,external_id',ignoreDuplicates:true});if(error)throw error;}
 return Response.json({received:true});
 }catch{return Response.json({error:'Evento não persistido. Reenvio necessário.'},{status:500});}}
