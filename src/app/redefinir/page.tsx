import AuthForm from '@/components/auth-form';import {configured} from '@/lib/supabase/server';
export default function Page(){return <AuthForm mode="reset" configured={configured()}/>}
