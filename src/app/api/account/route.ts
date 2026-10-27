import {createClient} from '@supabase/supabase-js';import {z} from 'zod';import {requireUser,adminClient} from '@/lib/supabase/server';import {sameOrigin,limitedBody} from '@/lib/http';
export async function DELETE(req:Request){if(!sameOrigin(req))return Response.json({error:'Origem inválida.'},{status:403});try{
 const {db,user}=await requireUser();const {password}=z.object({confirm:z.literal('EXCLUIR'),password:z.string().min(1).max(128)}).parse(JSON.parse(await limitedBody(req)));
 const verifier=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error:authError}=await verifier.auth.signInWithPassword({email:user.email!,password});if(authError)return Response.json({error:'Senha incorreta.'},{status:401});
 const admin=adminClient();const {data:subscription}=await db.from('subscriptions').select('status').eq('user_id',user.id).maybeSingle();
 if(subscription?.status==='active')return Response.json({error:'Cancele a assinatura na Cakto antes da exclusão para interromper futuras cobranças.'},{status:409});
 await verifier.auth.signOut({scope:'global'});await db.auth.signOut({scope:'global'});
 const {error}=await admin.auth.admin.deleteUser(user.id);if(error)throw error;return Response.json({ok:true});
 }catch{return Response.json({error:'Não foi possível excluir a conta. Tente novamente ou contate o suporte.'},{status:400});}}
