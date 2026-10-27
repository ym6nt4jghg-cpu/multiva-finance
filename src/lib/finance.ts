import { z } from 'zod';

export const categories = ['Alimentação','Transporte','Moradia','Saúde','Educação','Lazer','Compras','Assinaturas','Contas','Pets','Viagens','Outros'];
export function cents(input: string): number {
  const value = input.trim().replace(/^R\$\s*/, '');
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(value)) throw new Error('Informe um valor como 1.250,50.');
  const [whole, fraction=''] = value.replaceAll('.', '').split(',');
  const n = Number(whole)*100 + Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(n) || n <= 0 || n > 100_000_000_00) throw new Error('Valor fora do limite permitido.');
  return n;
}
export const money = (value: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
export function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function validDate(value:string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
export const transactionSchema = z.object({
  description:z.string().trim().min(2).max(140), amount_cents:z.number().int().positive().max(100_000_000_00),
  kind:z.enum(['income','expense']), category:z.string().trim().min(1).max(60),
  date:z.string().refine(validDate,'Data inválida'), account_id:z.string().uuid().nullable(),
  status:z.enum(['paid','pending']), notes:z.string().max(500).default(''), idempotency_key:z.string().uuid(),
});
export type TransactionInput=z.infer<typeof transactionSchema>;
export type Transaction=TransactionInput & {id:string; created_at?:string; card_id?:string|null; installment_group?:string|null};
export type Account={id:string; name:string; opening_cents:number; type:string};
export type Goal={id:string; name:string; target_cents:number; saved_cents:number; deadline:string|null};
export type Budget={id:string; category:string; limit_cents:number; month:string};
export type Card={id:string; name:string; limit_cents:number; closing_day:number; due_day:number};
export type Recurring={id:string; description:string; amount_cents:number; category:string; next_date:string; active:boolean};
export type FinanceData={transactions:Transaction[]; accounts:Account[]; goals:Goal[]; budgets:Budget[]; cards:Card[]; recurring:Recurring[]; customCategories:string[]; transfers?:{id:string;from_account:string;to_account:string;amount_cents:number;date:string}[];payments?:{id:string;account_id:string;card_id:string;amount_cents:number;month:string;date:string}[]};
export const emptyData:FinanceData={transactions:[],accounts:[],goals:[],budgets:[],cards:[],recurring:[],customCategories:[]};
export function summary(data:FinanceData,month:string) {
  const rows=data.transactions.filter(t=>t.date.startsWith(month)&&t.status==='paid');
  const income=rows.filter(t=>t.kind==='income').reduce((s,t)=>s+t.amount_cents,0);
  const expense=rows.filter(t=>t.kind==='expense').reduce((s,t)=>s+t.amount_cents,0);
  const balance=data.accounts.reduce((s,a)=>s+a.opening_cents,0)+data.transactions.filter(t=>t.status==='paid'&&!t.card_id).reduce((s,t)=>s+(t.kind==='income'?t.amount_cents:-t.amount_cents),0)-(data.payments||[]).reduce((s,p)=>s+p.amount_cents,0);
  const byCategory=Object.entries(rows.filter(t=>t.kind==='expense').reduce<Record<string,number>>((a,t)=>{a[t.category]=(a[t.category]||0)+t.amount_cents;return a;},{})).sort((a,b)=>b[1]-a[1]);
  return {income,expense,balance,result:income-expense,byCategory};
}
export function splitInstallments(total:number,count:number):number[] {
  if(!Number.isSafeInteger(total)||!Number.isInteger(count)||count<1||count>48||total<count) throw new Error('Parcelamento inválido.');
  return Array.from({length:count},(_,i)=>Math.floor(total/count)+(i<total%count?1:0));
}
export function addMonths(date:string,offset:number) {
  const [y,m,d]=date.split('-').map(Number);const base=new Date(Date.UTC(y,m-1+offset,1));
  const last=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate();base.setUTCDate(Math.min(d,last));return base.toISOString().slice(0,10);
}
export function statementMonth(purchase:string,closing:number,due:number) {
  let month=purchase.slice(0,7)+'-01';if(Number(purchase.slice(8))>=closing)month=addMonths(month,1);
  if(due<=closing)month=addMonths(month,1);return month;
}
