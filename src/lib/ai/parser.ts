import {z} from 'zod';
import {cents,today,validDate} from '../finance';
export const intentSchema=z.object({intent:z.enum(['create','summary','clarify']),kind:z.enum(['income','expense']).nullable(),amount_cents:z.number().int().positive().max(100_000_000_00).nullable(),description:z.string().max(140).nullable(),category:z.string().max(60).nullable(),date:z.string().refine(validDate).nullable(),question:z.string().max(300).nullable()});
export type Intent=z.infer<typeof intentSchema>;
const base:Intent={intent:'clarify',kind:null,amount_cents:null,description:null,category:null,date:null,question:null};
export function interpretLocal(text:string):Intent {
 const s=text.trim();
 if(s.length>1000)return {...base,question:'Envie uma mensagem de até 1.000 caracteres.'};
 if(/ignore|instru[çc][õo]es|system|sql|senha|prompt|token|admin/i.test(s))return {...base,question:'Posso ajudar apenas a organizar seus registros financeiros.'};
 if(/apaga|exclu|corrig|edit|parcel|vezes|amanh|ontem|semana|ano passado|m[eê]s passado|\d{1,2}\/\d{1,2}/i.test(s))return {...base,question:'Para datas específicas, parcelas ou correções, use o formulário do painel. Assim você confere todos os detalhes.'};
 if(/quanto|saldo|resumo/i.test(s))return {...base,intent:'summary'};
 const matches=[...s.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s*reais)?/gi)];
 const income=/\b(recebi|receita|sal[áa]rio|entrou)\b/i.test(s),expense=/\b(gastei|paguei|comprei|despesa)\b/i.test(s);
 if(matches.length!==1||income===expense)return {...base,question:'Qual foi o valor e se foi uma entrada ou saída? Exemplo: “Gastei 35 reais no almoço”.'};
 let amount:number;try{amount=cents(matches[0][1]);}catch{return {...base,question:'Não reconheci esse valor. Use, por exemplo, 35,90 reais.'};}
 const category=/almo[çc]o|mercado|comida|caf[ée]|restaurante/i.test(s)?'Alimentação':/uber|[ôo]nibus|combust[íi]vel|gasolina/i.test(s)?'Transporte':/academia|farm[áa]cia|m[ée]dico/i.test(s)?'Saúde':/aluguel|condom[íi]nio/i.test(s)?'Moradia':/netflix|spotify/i.test(s)?'Assinaturas':'Outros';
 const description=s.replace(matches[0][0],'').replace(/^(gastei|paguei|comprei|recebi)\s*/i,'').replace(/^\s*(reais|no|na|de|em|com)\s+/gi,'').trim().replace(/[.!]$/,'');
 if(description.length<2)return {...base,question:'Com o que foi esse lançamento? Informe uma descrição para continuar.'};
 return {...base,intent:'create',kind:income?'income':'expense',amount_cents:amount,description:description.charAt(0).toUpperCase()+description.slice(1),category,date:today()};
}
