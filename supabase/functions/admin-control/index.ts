import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const allowedPlans=new Set(['start','pro','premium']);

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return json({error:'Método inválido.'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token=req.headers.get('Authorization')||'';
    const session=createClient(url,anon,{global:{headers:{Authorization:token}},auth:{persistSession:false}});
    const {data:{user},error:userError}=await session.auth.getUser();
    if(userError||!user)return json({error:'Sessão inválida.'},401);
    const {error:adminError}=await session.rpc('admin_metrics');
    if(adminError)return json({error:'Acesso negado.'},403);
    const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json();
    const audit=async(action:string,target_user_id:string|null,details:Record<string,unknown>)=>{const {error}=await admin.from('admin_audit').insert({admin_user_id:user.id,target_user_id,action,details});if(error)throw error;};
    const find=async(email:string)=>{for(let page=1;page<=20;page++){const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});if(error)throw error;const found=data.users.find(item=>item.email?.toLowerCase()===email.toLowerCase());if(found)return found;if(data.users.length<100)break;}return null;};
    if(body.operation==='snapshot'){
      const [{data:plans,error:pe},{data:subscriptions,error:se},{data:support,error:sue},{data:auth,error:ue}]=await Promise.all([admin.from('subscription_plans').select('id,name,price_cents,monthly_messages,enabled').order('price_cents'),admin.from('finance_subscriptions').select('user_id,plan_id,status,current_period_end'),admin.from('support_requests').select('id,user_id,subject,message,status,created_at').order('created_at',{ascending:false}).limit(20),admin.auth.admin.listUsers({page:1,perPage:100})]);
      if(pe||se||sue||ue)throw pe||se||sue||ue;return json({plans,subscriptions,support,users:auth.users.map(item=>({id:item.id,email:item.email||'',name:String(item.user_metadata?.name||item.email?.split('@')[0]||'Cliente'),created_at:item.created_at,last_sign_in_at:item.last_sign_in_at||null}))});
    }
    if(body.operation==='create_user'){
      const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim(),password=String(body.password||''),plan=body.plan?String(body.plan):null,days=Number(body.days||30);
      if(!/^\S+@\S+\.\S+$/.test(email)||name.length<2||name.length>80||password.length<10||password.length>128||(plan&&!allowedPlans.has(plan))||!Number.isInteger(days)||days<1||days>3660)return json({error:'Dados inválidos.'},400);
      if(await find(email))return json({error:'Este e-mail já possui cadastro.'},409);
      const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name}});if(error||!data.user)throw error||new Error('create_failed');
      try{if(plan){const until=new Date(Date.now()+days*86400000).toISOString();const {error:e}=await admin.from('finance_subscriptions').upsert({user_id:data.user.id,plan_id:plan,status:'active',current_period_end:until,last_event_at:new Date().toISOString()},{onConflict:'user_id'});if(e)throw e;}await audit('user.created',data.user.id,{email,plan,days});return json({ok:'Cadastro criado com sucesso.'});}catch(error){await admin.auth.admin.deleteUser(data.user.id);throw error;}
    }
    if(body.operation==='assign_plan'){
      const email=String(body.email||'').trim().toLowerCase(),plan=String(body.plan||''),days=Number(body.days);if(!allowedPlans.has(plan)||!Number.isInteger(days)||days<1||days>3660)return json({error:'Dados inválidos.'},400);const target=await find(email);if(!target)return json({error:'Cadastro não encontrado.'},404);const until=new Date(Date.now()+days*86400000).toISOString();const {error}=await admin.from('finance_subscriptions').upsert({user_id:target.id,plan_id:plan,status:'active',current_period_end:until,last_event_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;await audit('subscription.assigned',target.id,{email,plan,days});return json({ok:'Plano liberado para o e-mail informado.'});
    }
    if(body.operation==='update_plan'){
      const id=String(body.id||''),price_cents=Number(body.price_cents),monthly_messages=Number(body.monthly_messages),enabled=body.enabled===true;if(!allowedPlans.has(id)||!Number.isInteger(price_cents)||price_cents<0||!Number.isInteger(monthly_messages)||monthly_messages<0)return json({error:'Dados inválidos.'},400);const {error}=await admin.from('subscription_plans').update({price_cents,monthly_messages,enabled}).eq('id',id);if(error)throw error;await audit('plan.updated',null,{id,price_cents,monthly_messages,enabled});return json({ok:'Plano atualizado.'});
    }
    if(body.operation==='resolve_support'){
      const id=String(body.id||'');const {error}=await admin.from('support_requests').update({status:'resolved'}).eq('id',id);if(error)throw error;await audit('support.resolved',null,{request_id:id});return json({ok:'Chamado marcado como resolvido.'});
    }
    return json({error:'Operação inválida.'},400);
  }catch{return json({error:'Não foi possível concluir a operação.'},500);}
});
