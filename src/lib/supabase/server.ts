import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export const configured=()=>!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export async function supabase() {
 if(!configured()) throw new Error('Configure o projeto Supabase independente para ativar contas reais.');
 const jar=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:items=>{try{items.forEach(({name,value,options})=>jar.set(name,value,{...options,sameSite:'lax',secure:process.env.NODE_ENV==='production'}));}catch{/* Server component: refresh is handled by proxy. */}}}});
}
export function adminClient(){
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY||!configured())throw new Error('Integração indisponível.');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function requireUser(){const db=await supabase();const {data:{user},error}=await db.auth.getUser();if(error||!user)throw new Error('Entre na sua conta para continuar.');return {db,user};}
