import {createHmac,timingSafeEqual} from 'node:crypto';
export function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function verifyMeta(raw:string,signature:string|null,secret:string){return !!secret&&!!signature&&/^sha256=[a-f0-9]{64}$/.test(signature)&&safeEqual(signature,'sha256='+createHmac('sha256',secret).update(raw).digest('hex'));}
export function verifyCakto(raw:string,timestamp:string|null,signature:string|null,secret:string,now=Date.now()){
 if(!secret||!timestamp||!/^\d{10}$/.test(timestamp)||!signature||Math.abs(now/1000-Number(timestamp))>300)return false;
 const expected='v1='+createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');return signature.split(',').some(s=>safeEqual(s.trim(),expected));
}
