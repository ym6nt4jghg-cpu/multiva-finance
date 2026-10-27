import 'server-only';
import {requireUser} from './supabase/server';

export async function requireAdmin(){
  const {db,user}=await requireUser();
  const metrics=await db.rpc('admin_metrics');
  if(metrics.error)throw new Error('Acesso administrativo negado.');
  return {db,user,metrics:metrics.data as Record<string,number>};
}
