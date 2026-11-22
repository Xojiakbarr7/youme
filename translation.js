'use strict';
// Sends only public product/category texts, never customer details or private credentials.
const cache = new Map();
const known = new Map(Object.entries({
  'kuzatuv kamerasi':'Камера видеонаблюдения',
  'kuzatuv kameralari':'Камеры видеонаблюдения',
  'quyosh panelli kamera':'Камера с солнечной панелью',
  'quyosh panelli kameralar':'Камеры с солнечной панелью',
  'shishiriladigan matras':'Надувной матрас',
  'shishiriladigan matraslar':'Надувные матрасы',
  'shishiriladigan kreslo':'Надувное кресло',
  'shishiriladigan kreslolar':'Надувные кресла',
  'ikki kishilik shishiriladigan matras':'Двуспальный надувной матрас',
  'bir kishilik shishiriladigan matras':'Односпальный надувной матрас',
  'aqlli kuzatuv kamerasi':'Умная камера видеонаблюдения',
  'kreslo va puf':'Кресло с пуфом'
}));
const wordMap = {
 'kuzatuv':'наблюдения','kamera':'камера','kamerasi':'камера','kameralar':'камеры',
 'kameralari':'камеры','quyosh':'солнечная','panelli':'с панелью',
 'shishiriladigan':'надувной','matras':'матрас','matrasi':'матрас','kreslo':'кресло',
 'kreslosi':'кресло','kreslolar':'кресла','qora':'чёрный','oq':'белый',
 'ko‘k':'синий','ikki':'два','bir':'один','kishilik':'местный','yangi':'новый',
 'bilan':'с','va':'и','uchun':'для','puf':'пуф','qulay':'удобный',
 'aqlli':'умная','nasos':'насос','sifatli':'качественный','antennali':'с антеннами',
 'tungi':'ночной','tashqi':'уличная','batareya':'батарея','uzoq':'долго',
 'ishlaydi':'работает','to‘plami':'комплект','o‘lchami':'размер'
};
function fallback(s) {
 const found=known.get(s.toLowerCase());if(found)return found;
 let converted=0;
 const out=s.replace(/[A-Za-zʻʼ‘’']+/g,w=>{const t=wordMap[w.toLowerCase()];if(t)converted++;return t||w});
 return converted?out:'';
}
function chunks(input) {
 const out=[];let cur='';
 for(const word of input.split(/\s+/)) {
  if(!word)continue;
  if((cur+' '+word).trim().length>350 && cur){out.push(cur);cur='';}
  if(word.length>350){if(cur)out.push(cur);for(let i=0;i<word.length;i+=350)out.push(word.slice(i,i+350));cur='';continue;}
  cur+=(cur?' ':'')+word;
 }
 if(cur)out.push(cur);return out;
}
async function requestTranslation(q,from,to) {
 const url=new URL('https://api.mymemory.translated.net/get');
 url.searchParams.set('q',q);url.searchParams.set('langpair',from+'|'+to);url.searchParams.set('mt','1');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4800);
 try {
  const r=await fetch(url,{signal:controller.signal,headers:{accept:'application/json'}});
  if(!r.ok)throw Error('http_'+r.status);
  const j=await r.json(),v=String(j?.responseData?.translatedText||'').trim();
  if(Number(j.responseStatus)!==200 || !v || /MYMEMORY WARNING|QUERY LENGTH LIMIT EXCEEDED|INVALID LANGUAGE PAIR/i.test(v))throw Error('bad_translation');
  return v;
 }finally{clearTimeout(timer);}
}
async function translateUzToRu(input) {
 const s=String(input||'').trim();if(!s)return '';
 if(cache.has(s))return cache.get(s);
 let translated=known.get(s.toLowerCase())||'';
 if(!translated){
  try{
   let parts=chunks(s);if(parts.length>4)throw Error('too_long');
   let out=[];
   for(const part of parts){
    let t=await requestTranslation(part,'uz','ru');
    if(!/[А-Яа-яЁё]/u.test(t)&&/[A-Za-z]/.test(part)){
      t=await requestTranslation(await requestTranslation(part,'uz','en'),'en','ru');
    }
    out.push(t);
   }
   translated=out.join(' ');
  }catch(e){console.warn('Automatic catalog translation unavailable:',e.message);translated=fallback(s);}
  if(!/[А-Яа-яЁё]/u.test(translated)&&/[A-Za-z]/.test(s))translated=fallback(s);
 }
 if(!translated)throw Object.assign(new Error('translation_unavailable'),{status:503});
 if(cache.size>400)cache.clear();
 cache.set(s,translated);return translated;
}
module.exports={translateUzToRu};
