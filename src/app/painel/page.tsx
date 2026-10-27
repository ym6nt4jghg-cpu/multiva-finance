import {redirect} from 'next/navigation';import {configured,supabase} from '@/lib/supabase/server';import {loadFinance} from '@/app/actions';import Dashboard from '@/components/dashboard';
export const dynamic='force-dynamic';
export default async function Page(){if(!configured())redirect('/entrar');const db=await supabase();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/entrar');const data=await loadFinance();return <Dashboard initial={data} name={user.user_metadata?.name||'Boas-vindas'} demo={false}/>}
