export function sameOrigin(req:Request){const origin=req.headers.get('origin'),expected=new URL(process.env.APP_URL||req.url).origin;return origin===expected;}
export async function limitedBody(req:Request,max=16384):Promise<string>{
 if(Number(req.headers.get('content-length')||0)>max)throw new Error('Corpo excede o limite.');
 const reader=req.body?.getReader();if(!reader)return '';const chunks:Uint8Array[]=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw new Error('Corpo excede o limite.');}chunks.push(value);}
 return Buffer.concat(chunks).toString('utf8');
}
