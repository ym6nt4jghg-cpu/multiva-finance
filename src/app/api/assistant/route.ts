import {z} from 'zod';import {requireUser} from '@/lib/supabase/server';import {interpreter} from '@/lib/ai/provider';import {sameOrigin,limitedBody} from '@/lib/http';import {today,money} from '@/lib/finance';
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Origem inválida.'},{status:403});
 try{const {db}=await requireUser();const {text,month}=z.object({text:z.string().trim().min(2).max(1000),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).default(today().slice(0,7))}).parse(JSON.parse(await limitedBody(req,4096)));
 const {data:allowed,error}=await db.rpc('reserve_ai_request');if(error||!allowed)return Response.json({error:'Limite de uso atingido. Tente mais tarde ou registre pelo formulário.'},{status:429});
 const result=await interpreter().interpret(text);await db.rpc('complete_ai_request',{p_id:allowed,p_provider:result.provider,p_input:result.inputTokens,p_output:result.outputTokens});
 let answer:string|undefined;if(result.intent.intent==='summary'){const {data,error}=await db.rpc('financial_summary',{p_month:month+'-01'});if(error)throw new Error('Não foi possível consultar seus números.');answer=`Resumo de ${month.split('-').reverse().join('/')}: receitas de ${money(Number(data.income))}, despesas de ${money(Number(data.expense))} e resultado de ${money(Number(data.income)-Number(data.expense))}. Saldo registrado total: ${money(Number(data.balance))}.`;}
 return Response.json({...result,answer},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Assistente indisponível.'},{status:400});}
}
