import 'server-only';
import type {SupabaseClient,User} from '@supabase/supabase-js';
import {adminClient,requireUser} from './supabase/server';

export async function requireAdmin(){
  const {db,user}=await requireUser();
  const metrics=await db.rpc('admin_metrics');
  if(metrics.error)throw new Error('Acesso administrativo negado.');
  return {admin:adminClient(),user,metrics:metrics.data as Record<string,number>};
}

export async function findUserByEmail(admin:SupabaseClient,email:string):Promise<User|null>{
  const wanted=email.trim().toLowerCase();
  for(let page=1;page<=20;page++){
    const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});
    if(error)throw error;
    const found=data.users.find(user=>user.email?.toLowerCase()===wanted);
    if(found)return found;
    if(data.users.length<100)break;
  }
  return null;
}
