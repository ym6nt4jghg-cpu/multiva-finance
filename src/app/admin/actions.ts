'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {findUserByEmail,requireAdmin} from '@/lib/admin';

export type AdminActionState={ok?:string;error?:string};
const email=z.string().trim().email().max(254);
const plan=z.enum(['start','pro','premium']);
const days=z.coerce.number().int().min(1).max(3660);

async function audit(admin:Awaited<ReturnType<typeof requireAdmin>>['admin'],adminId:string,action:string,targetId?:string,details:Record<string,unknown>={}){
  const {error}=await admin.from('admin_audit').insert({admin_user_id:adminId,target_user_id:targetId||null,action,details});
  if(error)throw error;
}

export async function createManagedUser(_:AdminActionState,form:FormData):Promise<AdminActionState>{
  let createdId:string|undefined;
  try{
    const input=z.object({email,password:z.string().min(8).max(128),name:z.string().trim().min(2).max(80),plan:z.preprocess(value=>value===''?undefined:value,plan.optional()),days:days.optional(),confirmed:z.literal('on')}).parse(Object.fromEntries(form));
    const {admin,user:operator}=await requireAdmin();
    if(await findUserByEmail(admin,input.email))return {error:'Este e-mail já possui cadastro.'};
    const {data,error}=await admin.auth.admin.createUser({email:input.email,password:input.password,email_confirm:true,user_metadata:{name:input.name}});
    if(error||!data.user)throw error||new Error('Cadastro não criado.');
    createdId=data.user.id;
    if(input.plan){
      const until=new Date(Date.now()+(input.days||30)*86400000).toISOString();
      const {error:subscriptionError}=await admin.from('subscriptions').upsert({user_id:createdId,plan_id:input.plan,status:'active',current_period_end:until,last_event_at:new Date().toISOString()},{onConflict:'user_id'});
      if(subscriptionError)throw subscriptionError;
    }
    await audit(admin,operator.id,'user.created',createdId,{email:input.email,plan:input.plan||null,days:input.days||null});
    revalidatePath('/admin');
    return {ok:'Cadastro criado com sucesso.'};
  }catch(error){
    if(createdId){try{const {admin}=await requireAdmin();await admin.auth.admin.deleteUser(createdId);}catch{/* rollback best effort */}}
    return {error:error instanceof z.ZodError?'Confira nome, e-mail, senha e confirmação.':'Não foi possível criar o cadastro.'};
  }
}

export async function assignPlan(_:AdminActionState,form:FormData):Promise<AdminActionState>{
  try{
    const input=z.object({email,plan,days}).parse(Object.fromEntries(form));
    const {admin,user:operator}=await requireAdmin();
    const target=await findUserByEmail(admin,input.email);
    if(!target)return {error:'Cadastro não encontrado.'};
    const until=new Date(Date.now()+input.days*86400000).toISOString();
    const {error}=await admin.from('subscriptions').upsert({user_id:target.id,plan_id:input.plan,status:'active',current_period_end:until,last_event_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error)throw error;
    await audit(admin,operator.id,'subscription.assigned',target.id,{email:input.email,plan:input.plan,days:input.days});
    revalidatePath('/admin');
    return {ok:'Plano liberado para o e-mail informado.'};
  }catch(error){return {error:error instanceof z.ZodError?'Confira o e-mail, plano e validade.':'Não foi possível liberar o plano.'};}
}

export async function updatePlan(_:AdminActionState,form:FormData):Promise<AdminActionState>{
  try{
    const input=z.object({id:plan,price:z.coerce.number().min(0).max(100000),messages:z.coerce.number().int().min(0).max(1000000),enabled:z.string().optional()}).parse(Object.fromEntries(form));
    const {admin,user}=await requireAdmin();
    const {error}=await admin.from('subscription_plans').update({price_cents:Math.round(input.price*100),monthly_messages:input.messages,enabled:input.enabled==='on'}).eq('id',input.id);
    if(error)throw error;
    await audit(admin,user.id,'plan.updated',undefined,{plan:input.id,price_cents:Math.round(input.price*100),monthly_messages:input.messages,enabled:input.enabled==='on'});
    revalidatePath('/admin');
    return {ok:'Plano atualizado.'};
  }catch(error){return {error:error instanceof z.ZodError?'Confira os dados do plano.':'Não foi possível atualizar o plano.'};}
}

export async function resolveSupport(_:AdminActionState,form:FormData):Promise<AdminActionState>{
  try{
    const input=z.object({id:z.string().uuid()}).parse(Object.fromEntries(form));
    const {admin,user}=await requireAdmin();
    const {error}=await admin.from('support_requests').update({status:'resolved'}).eq('id',input.id);
    if(error)throw error;
    await audit(admin,user.id,'support.resolved',undefined,{request_id:input.id});
    revalidatePath('/admin');
    return {ok:'Chamado marcado como resolvido.'};
  }catch{return {error:'Não foi possível atualizar o chamado.'};}
}
