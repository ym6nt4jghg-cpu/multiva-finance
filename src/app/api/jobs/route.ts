import {runJobs,flushOutbox} from '@/lib/integrations/worker';import {safeEqual} from '@/lib/integrations/signatures';
export async function POST(req:Request){if(!process.env.CRON_SECRET||!safeEqual(req.headers.get('authorization')||'',`Bearer ${process.env.CRON_SECRET}`))return Response.json({error:'Unauthorized'},{status:401});try{const jobs=await runJobs();const outbox=process.env.WHATSAPP_ENABLED==='true'?await flushOutbox():{sent:0};return Response.json({...jobs,...outbox});}catch{return Response.json({error:'Worker unavailable'},{status:503});}}
export const GET=POST;
