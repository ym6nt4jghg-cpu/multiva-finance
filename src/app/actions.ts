'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {supabase,requireUser} from '@/lib/supabase/server';
import {transactionSchema,validDate,type FinanceData} from '@/lib/finance';

export async function authAction(mode:string,form:FormData):Promise<{error?:string;message?:string}>{
 try{
  const db=await supabase(),email=z.email().parse(form.get('email'));
  const base=process.env.APP_URL||'http://localhost:3000';
  if(mode==='recover'){const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:`${base}/auth/callback?next=/redefinir`});if(error)return {error:'Não foi possível enviar agora. Tente novamente.'};return {message:'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'};}
  const password=z.string().min(10).max(128).parse(form.get('password'));
  if(mode==='signup'){
   if(form.get('consent')!=='on')return {error:'Leia e aceite os termos para criar a conta.'};
   const name=z.string().trim().min(2).max(80).parse(form.get('name'));
   const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:`${base}/auth/callback`,data:{name,terms_version:'2026-10-26'}}});
   if(error)return {error:'Cadastro indisponível. Confira os dados ou tente entrar.'};if(!data.session)return {message:'Confira seu e-mail para confirmar a conta. Depois, entre para começar.'};
  }else {const {error}=await db.auth.signInWithPassword({email,password});if(error)return {error:'E-mail ou senha inválidos. Confira também a confirmação do seu e-mail.'};}
 }catch(e){return {error:e instanceof z.ZodError?'Confira o e-mail e use uma senha com pelo menos 10 caracteres.':e instanceof Error?e.message:'Não foi possível entrar.'};}
 redirect('/painel');
}
export async function resetPassword(form:FormData){try{const {db}=await requireUser();const password=z.string().min(10).max(128).parse(form.get('password'));const {error}=await db.auth.updateUser({password});if(error)throw error;return {message:'Senha atualizada. Você já pode acessar o painel.'};}catch{return {error:'O link pode ter expirado. Solicite uma nova recuperação.'};}}
export async function signOut(){const db=await supabase();await db.auth.signOut();redirect('/entrar');}

export async function loadFinance():Promise<FinanceData>{
 const {db}=await requireUser();
 const names=['financial_transactions','financial_accounts','savings_goals','budgets','credit_cards','recurring_transactions','transaction_categories','account_transfers','statement_payments'];
 const results=await Promise.all(names.map(async name=>{const rows:Record<string,unknown>[]=[];for(let offset=0;offset<100000;offset+=500){const result=await db.from(name).select('*').order('created_at',{ascending:false}).order('id').range(offset,offset+499);if(result.error)return result;rows.push(...result.data);if(result.data.length<500)return {data:rows,error:null};}return {data:null,error:new Error('Limite de exportação atingido')};}));
 if(results.some(r=>r.error))throw new Error('Não foi possível carregar seus dados. Verifique a conexão e as migrações do banco.');
 return {transactions:results[0].data!,accounts:results[1].data!,goals:results[2].data!,budgets:results[3].data!,cards:results[4].data!,recurring:results[5].data!,customCategories:results[6].data!.map(x=>String(x.name)),transfers:results[7].data!,payments:results[8].data!} as unknown as FinanceData;
}
export async function saveTransaction(input:unknown,id?:string){
 try{const {db,user}=await requireUser();const values=transactionSchema.parse(input);if(id)z.uuid().parse(id);
 const result=id?await db.from('financial_transactions').update({...values}).eq('id',id).eq('user_id',user.id).is('card_id',null).select('id').single():await db.from('financial_transactions').insert({...values,user_id:user.id}).select('id').single();
 if(result.error){if(!id&&result.error.code==='23505'){const {data}=await db.from('financial_transactions').select('id').eq('idempotency_key',values.idempotency_key).single();if(data)return {ok:true};}throw result.error;}
 revalidatePath('/painel');return {ok:true};}catch{return {error:'Não foi possível salvar. Confira os campos, a conta e sua conexão.'};}
}
export async function deleteTransaction(id:string){try{const {db,user}=await requireUser();z.uuid().parse(id);const {error}=await db.from('financial_transactions').delete().eq('id',id).eq('user_id',user.id).is('card_id',null).select('id').single();if(error)throw error;revalidatePath('/painel');return {ok:true};}catch{return {error:'Não foi possível excluir esse lançamento.'};}}
const amount=z.number().int().min(0).max(100_000_000_00),name=z.string().trim().min(2).max(80);
const schemas={
 accounts:z.object({name,type:z.enum(['digital','checking','cash','wallet']),opening_cents:amount}),
 goals:z.object({name,target_cents:amount.positive(),saved_cents:amount,deadline:z.string().refine(validDate).nullable()}),
 budgets:z.object({category:name,limit_cents:amount.positive(),month:z.string().regex(/^\d{4}-\d{2}-01$/).refine(validDate)}),
 cards:z.object({name,limit_cents:amount.positive(),closing_day:z.number().int().min(1).max(28),due_day:z.number().int().min(1).max(28)}),
 recurring:z.object({description:name,amount_cents:amount.positive(),category:name,next_date:z.string().refine(validDate),active:z.boolean()}),
 categories:z.object({name}),
};
const tables={accounts:'financial_accounts',goals:'savings_goals',budgets:'budgets',cards:'credit_cards',recurring:'recurring_transactions',categories:'transaction_categories'};
export async function saveEntity(kind:keyof typeof schemas,input:unknown,id?:string){
 try{if(!schemas[kind])throw new Error();const {db,user}=await requireUser();const values=schemas[kind].parse(input);if(id)z.uuid().parse(id);
 const query=id?db.from(tables[kind]).update(values).eq('id',id).eq('user_id',user.id):db.from(tables[kind]).insert({...values,user_id:user.id});const {error}=await query.select('id').single();if(error)throw error;revalidatePath('/painel');return {ok:true};}catch{return {error:'Não foi possível salvar. Confira os valores e evite registros repetidos.'};}
}
export async function recordTransfer(input:unknown){try{const {db}=await requireUser();const v=z.object({from:z.uuid(),to:z.uuid(),amount:amount.positive(),date:z.string().refine(validDate),key:z.uuid()}).parse(input);if(v.from===v.to)throw new Error();const {error}=await db.rpc('transfer_funds',{p_from:v.from,p_to:v.to,p_amount:v.amount,p_date:v.date,p_key:v.key});if(error)throw error;return {ok:true};}catch{return {error:'Não foi possível registrar a transferência.'};}}
export async function recordCardPurchase(input:unknown){try{const {db}=await requireUser();const v=z.object({card:z.uuid(),description:name,amount:amount.positive(),count:z.number().int().min(1).max(48),date:z.string().refine(validDate),category:name,key:z.uuid()}).parse(input);const {error}=await db.rpc('record_card_purchase',{p_card:v.card,p_description:v.description,p_amount:v.amount,p_count:v.count,p_date:v.date,p_category:v.category,p_key:v.key});if(error)throw error;return {ok:true};}catch{return {error:'Não foi possível registrar a compra. Confira o cartão e as parcelas.'};}}
export async function payStatement(input:unknown){try{const {db}=await requireUser();const v=z.object({card:z.uuid(),month:z.string().regex(/^\d{4}-\d{2}-01$/).refine(validDate),account:z.uuid(),date:z.string().refine(validDate),key:z.uuid()}).parse(input);const {error}=await db.rpc('pay_statement',{p_card:v.card,p_month:v.month,p_account:v.account,p_date:v.date,p_key:v.key});if(error)throw error;return {ok:true};}catch{return {error:'Fatura vazia, já paga ou indisponível. Confira o mês e a conta.'};}}
export async function exportData(){await requireUser();return loadFinance();}
