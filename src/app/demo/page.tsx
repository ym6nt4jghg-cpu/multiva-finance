import Dashboard from '@/components/dashboard';import {demoData} from '@/lib/demo';
export const dynamic='force-dynamic';
export default function Page(){return <Dashboard initial={demoData()} name="Alex" demo/>}
