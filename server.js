'use strict';
/** YOU ME Online Shop — Node.js 22+ server with persistent Neon PostgreSQL. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { translateUzToRu } = require('./translation');
const locations = require('./public/locations.json');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);
 
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const DATABASE_URL = process.env.DATABASE_URL || '';
const PRODUCTION = process.env.NODE_ENV === 'production';
if (PRODUCTION && (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET)) {
  throw new Error('Production requires ADMIN_PASSWORD and SESSION_SECRET environment variables.');
}
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'YouMeDemo!2026'; // Local demonstration ONLY.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
let db, catsQuery, publicProductsQuery, allProductsQuery;
function createSqliteAdapter(){
  fs.mkdirSync(DATA_DIR,{recursive:true});
  const local=new DatabaseSync(path.join(DATA_DIR,'youme.sqlite'));
  return {
    exec: async sql=>{local.exec(sql);},
    prepare: sql=>{
      const st=local.prepare(sql);
      return {get: async(...a)=>st.get(...a), all: async(...a)=>st.all(...a), run: async(...a)=>st.run(...a)};
    }
  };
}
function createPostgresAdapter(){
  const {Pool,types}=require('pg');
  types.setTypeParser(20,value=>Number(value));
  const pool=new Pool({connectionString:DATABASE_URL,max:5,idleTimeoutMillis:15000,connectionTimeoutMillis:12000});
  return {
    exec: async sql=>{await pool.query(sql);},
    prepare: sql=>{
      let i=0;
      const q=sql.replace(/\?/g,()=>'$'+(++i));
      return {
        get: async(...a)=>(await pool.query(q,a)).rows[0],
        all: async(...a)=>(await pool.query(q,a)).rows,
        run: async(...a)=>{
          const query=/^\s*INSERT\b/i.test(q)&&!/\bRETURNING\b/i.test(q)?q+' RETURNING *':q;
          const r=await pool.query(query,a);
          return {changes:r.rowCount,lastInsertRowid:r.rows[0]?.id??0};
        }
      };
    }
  };
}
async function initializeDatabase(){
  db=DATABASE_URL?createPostgresAdapter():createSqliteAdapter();
  if(DATABASE_URL){
    await db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name_uz TEXT NOT NULL, name_ru TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'camera', color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name_uz TEXT NOT NULL, name_ru TEXT NOT NULL,
  description_uz TEXT NOT NULL DEFAULT '', description_ru TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL, old_price INTEGER NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '', image_blob BYTEA, image_mime TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, demo INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL, total INTEGER NOT NULL,
  customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
  telegram_sent INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
`);
  } else {
    await db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    await db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_uz TEXT NOT NULL, name_ru TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'camera', color TEXT NOT NULL DEFAULT 'blue',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name_uz TEXT NOT NULL, name_ru TEXT NOT NULL,
  description_uz TEXT NOT NULL DEFAULT '', description_ru TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL, old_price INTEGER NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '', image_blob BLOB, image_mime TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL, total INTEGER NOT NULL,
  customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
  telegram_sent INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
`);
  }
  if(DATABASE_URL){
    await db.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT ''");
    await db.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS district TEXT NOT NULL DEFAULT ''");
    await db.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS extra_phone TEXT NOT NULL DEFAULT ''");
  }else{
    const columns=await db.prepare('PRAGMA table_info(orders)').all();
    for(const column of ['region','district','extra_phone']){
      if(!columns.some(c=>c.name===column))await db.exec("ALTER TABLE orders ADD COLUMN "+column+" TEXT NOT NULL DEFAULT ''");
    }
  }
  // Scheduled discounts live separately: original product price stays untouched.
  // Dates are normalized UTC ISO strings; valid in both Neon PG and SQLite.
  await db.exec(`
CREATE TABLE IF NOT EXISTS promotions (
  product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  sale_price INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL
);
`);
  await seed();
  await db.exec('CREATE TABLE IF NOT EXISTS app_migrations (key TEXT PRIMARY KEY)');
  // Upgrade older YOU ME databases without modifying saved admin prices or image uploads.
// All older /assets/ paths now point to the new cleaned studio photos.
if (!await db.prepare("SELECT key FROM app_migrations WHERE key='catalog_studio_2026_11'").get()) {
  const chairCat = await db.prepare("SELECT id FROM categories WHERE name_uz='Shishiriladigan kreslolar' LIMIT 1").get();
  if (chairCat && !await db.prepare("SELECT id FROM products WHERE name_uz='To‘q ko‘k shishiriladigan kreslo va puf' LIMIT 1").get()) {
    await db.prepare(`INSERT INTO products(category_id,name_uz,name_ru,description_uz,description_ru,price,old_price,stock,image_url,featured,active,demo)
      VALUES (?,?,?,?,?,?,?,?,?,1,1,0)`).run(chairCat.id,'To‘q ko‘k shishiriladigan kreslo va puf','Тёмно-синее надувное кресло с пуфом','To‘q ko‘k rangli shishiriladigan kreslo va dumaloq puf.','Тёмно-синее надувное кресло и круглый пуф.',0,0,10,'/assets/inflatable_chair_alt.webp');
  }
  await db.prepare("INSERT INTO app_migrations(key) VALUES ('catalog_studio_2026_11')").run();
}

  catsQuery=db.prepare('SELECT * FROM categories ORDER BY id');
  publicProductsQuery=db.prepare('SELECT id, category_id, name_uz, name_ru, description_uz, description_ru, price, old_price, stock, image_url, image_blob IS NOT NULL as has_blob, featured, active, demo, updated_at FROM products WHERE active=1 ORDER BY featured DESC, id DESC');
  allProductsQuery=db.prepare('SELECT id, category_id, name_uz, name_ru, description_uz, description_ru, price, old_price, stock, image_url, image_blob IS NOT NULL as has_blob, featured, active, demo, updated_at FROM products ORDER BY id DESC');
}
async function seed(){
  if((await db.prepare('SELECT COUNT(*) AS n FROM categories').get()).n)return;
  const cats = [
    ['Kuzatuv kameralari', 'Камеры видеонаблюдения', 'outdoor', 'blue'],
    ['Quyosh panelli kameralar', 'Камеры с солнечной панелью', 'solar', 'sand'],
    ['Shishiriladigan matraslar', 'Надувные матрасы', 'mattress', 'mint'],
    ['Shishiriladigan kreslolar', 'Надувные кресла', 'chair', 'lilac']
  ];
  const catStmt=db.prepare('INSERT INTO categories (name_uz,name_ru,icon,color) VALUES (?,?,?,?)');
  for(const c of cats)await catStmt.run(...c);
  const items=[
    [2,'Quyosh panelli ko‘p linzali kamera','Многолинзовая камера с солнечной панелью','Quyosh paneli bilan taqdim etilgan kuzatuv kamerasi. Aniq xususiyatlarni sotuvchidan so‘rang.','Камера наблюдения с солнечной панелью. Точные характеристики уточняйте у продавца.',0,0,10,'solar_four_lens.webp',1],
    [1,'YOU ME ko‘p linzali kamera','Многолинзовая камера YOU ME','Bir nechta obyektiv va tashqi antennalarga ega kamera. Texnik imkoniyatlarini sotuvchidan aniqlang.','Камера с несколькими объективами и наружными антеннами. Характеристики уточняйте у продавца.',0,0,10,'youme_promo_camera.webp',1],
    [1,'Ikki qavatli PTZ kamera','Двухуровневая поворотная камера PTZ','Ikki kamera bloki va tashqi antennalar ko‘rinishidagi kuzatuv kamerasi.','Камера наблюдения с двумя блоками и наружными антеннами.',0,0,10,'camera_dual_ptz.webp',1],
    [2,'Quyosh paneli bilan kamera to‘plami','Комплект камеры с солнечной панелью','Kamera, quyosh paneli va ulash kabelli to‘plam fotosurati.','На фото комплект из камеры, солнечной панели и кабеля.',0,0,10,'solar_kit.webp',1],
    [1,'Ikki antennali smart kamera','Умная камера с двумя антеннами','Ikki antennali, ikki kamera blokli kuzatuv kamerasi.','Камера наблюдения с двумя антеннами и двумя блоками.',0,0,10,'camera_antenna.webp',0],
    [1,'Qo‘shimcha blokli kuzatuv kamerasi','Камера видеонаблюдения с дополнительным блоком','Tashqi qismida qizil blok ko‘rinadigan kamera. Ishlash xususiyatlarini sotuvchidan aniqlang.','Камера с красным наружным блоком. Функции уточняйте у продавца.',0,0,10,'camera_siren.webp',0],
    [3,'Ikki kishilik shishiriladigan matras','Двуспальный надувной матрас','Ko‘k rangli shishiriladigan matras, ikkita yostiq bilan. Aniq o‘lcham va to‘plamni buyurtmadan oldin tekshiring.','Синий надувной матрас с двумя подушками. Уточните размер и комплектацию перед заказом.',0,0,10,'mattress_double.webp',1],
    [4,'Och ko‘k shishiriladigan kreslo va puf','Светло-голубое надувное кресло с пуфом','Och ko‘k rangli shishiriladigan kreslo va dumaloq puf.','Светло-голубое надувное кресло и круглый пуф.',0,0,10,'inflatable_chair.webp',1],
    [4,'To‘q ko‘k shishiriladigan kreslo va puf','Тёмно-синее надувное кресло с пуфом','To‘q ko‘k rangli shishiriladigan kreslo va dumaloq puf.','Тёмно-синее надувное кресло и круглый пуф.',0,0,10,'inflatable_chair_alt.webp',1]
  ];
  const ps=db.prepare(`INSERT INTO products (category_id,name_uz,name_ru,description_uz,description_ru,price,old_price,stock,image_url,featured,active,demo) VALUES (?,?,?,?,?,?,?,?,?,?,1,0)`);
  for(const x of items)await ps.run(...x.slice(0,8),'/assets/'+x[8],x[9]);
}
const statuses = new Set(['new','accepted','shipped','done','cancelled']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
const loginAttempts = new Map();
const orderAttempts = new Map();
const json = (res,status,data,extra={})=>{
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});
  res.end(JSON.stringify(data));
};
const cookieProps = (req)=>`Path=/; HttpOnly; SameSite=Lax${req.headers['x-forwarded-proto']==='https' || req.socket.encrypted ? '; Secure':''}`;
function sign(value) { return crypto.createHmac('sha256',SECRET).update(value).digest('base64url'); }
function session(req) {
  const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('youme_session='));
  if(!raw)return null;
  const token=raw.slice('youme_session='.length); const cut=token.lastIndexOf('.');
  if(cut<1)return null;
  const data=token.slice(0,cut), sig=token.slice(cut+1), expected=sign(data);
  if(sig.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
  try { const obj=JSON.parse(Buffer.from(data,'base64url').toString()); if(obj.exp>Date.now() && obj.user===ADMIN_USER)return obj; }catch{}
  return null;
}
function auth(req,res) {const s=session(req);if(!s)json(res,401,{error:'unauthorized'});return s;}
function originOK(req) {
  const origin=req.headers.origin;
  if(!origin)return true; // Non-browser clients / same origin old browsers.
  try {const u=new URL(origin);const f=(req.headers['x-forwarded-host']||req.headers.host||'');return u.host===f;}catch{return false;}
}
function csrfOK(req,s) {return Boolean(s && req.headers['x-youme-csrf'] === sign(s.csrf));}
function allow(map,ip,limit,windowMs){
  const now=Date.now();const x=map.get(ip)||[];const filtered=x.filter(t=>t>now-windowMs);filtered.push(now);map.set(ip,filtered);return filtered.length<=limit;
}
function safeIp(req){return req.socket.remoteAddress||'unknown';}
async function bodyJSON(req,max=4_500_000) {
  let chunks=[],size=0;
  for await(const c of req){size+=c.length;if(size>max)throw Object.assign(new Error('too_large'),{status:413});chunks.push(c);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');}catch{throw Object.assign(new Error('invalid_json'),{status:400});}
}
function clean(v,n=300){return String(v??'').trim().slice(0,n);}
function number(v,def=0){const n=Number(v);return Number.isSafeInteger(n)?n:def;}
function promotionActive(product,promo,now=Date.now()){
  if(!promo || Number(promo.sale_price)<=0 || Number(promo.sale_price)>=Number(product.price))return false;
  const starts=Date.parse(promo.starts_at),ends=Date.parse(promo.ends_at);
  return Number.isFinite(starts)&&Number.isFinite(ends)&&starts<=now&&now<ends;
}
function effectiveProduct(product,promo){
  if(!promotionActive(product,promo))return {...product,old_price:promo?0:product.old_price,sale_ends_at:null};
  return {...product,old_price:Number(product.price),price:Number(promo.sale_price),sale_ends_at:promo.ends_at};
}
function productView(p,promo=null){
  const x=effectiveProduct(p,promo);
  return {...x,has_blob:undefined,image_url:p.has_blob?`/api/products/${p.id}/image?v=${encodeURIComponent(p.updated_at)}`:p.image_url};
}
function promotionTime(v){
  const s=clean(v,64);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(s))return null;
  const d=Date.parse(s);
  return Number.isFinite(d)?new Date(d).toISOString():null;
}
function isValidUrl(v){return !v || /^https:\/\/[^\s<>]+$/i.test(v) || /^\/assets\/[a-z0-9_.-]+\.(svg|png|jpe?g|webp)$/i.test(v);}
function handleImage(data) {
  if(!data)return null;
  if(typeof data!=='string')throw Object.assign(new Error('invalid_image'),{status:400});
  const m=data.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!m)throw Object.assign(new Error('invalid_image'),{status:400});
  const b=Buffer.from(m[2],'base64'); if(b.length>3_000_000)throw Object.assign(new Error('image_too_large'),{status:400});
  const sig=b.subarray(0,12);
  const valid=(m[1]==='image/png'&&sig.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) ||
    (m[1]==='image/jpeg'&&sig.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))) ||
    (m[1]==='image/webp'&&sig.subarray(0,4).toString()==='RIFF'&&sig.subarray(8,12).toString()==='WEBP');
  if(!valid)throw Object.assign(new Error('invalid_image'),{status:400});
  return {bytes:b,mime:m[1]};
}
async function validateProduct(input,existing=null) {
  const p={category_id:number(input.category_id),name_uz:clean(input.name_uz,140),description_uz:clean(input.description_uz,1000),price:number(input.price,-1),old_price:number(input.old_price,0),stock:number(input.stock,0),image_url:clean(input.image_url,1000),featured:input.featured?1:0,active:input.active===false?0:1};
  if(p.price<=0 || p.old_price<0 || (p.old_price>0 && p.old_price<=p.price) || p.old_price>1_000_000_000)throw Object.assign(new Error('invalid_prices'),{status:400});
  if(!p.name_uz || p.price>1_000_000_000 || p.stock<0 || p.stock>1_000_000 || !isValidUrl(p.image_url) || !(await db.prepare('SELECT id FROM categories WHERE id=?').get(p.category_id)))throw Object.assign(new Error('invalid_product'),{status:400});
  p.name_ru=existing?.name_uz===p.name_uz && existing?.name_ru ? existing.name_ru : await translateUzToRu(p.name_uz);
  p.description_ru=!p.description_uz?'':existing?.description_uz===p.description_uz && existing?.description_ru ? existing.description_ru : await translateUzToRu(p.description_uz);
  return p;
}

async function notifyTelegram(order) {
  if(!BOT_TOKEN || !CHAT_ID)return false;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const price=n=>Number(n).toLocaleString('en-US').replaceAll(',',' ');
  const message=[`🛒 <b>YOU ME — YANGI BUYURTMA #${order.id}</b>`,``,`📦 <b>Mahsulot:</b> ${escape(order.product_name)}`,`🔢 <b>Soni:</b> ${order.quantity}`,`💵 <b>Jami:</b> ${price(order.total)} so‘m`,``,`👤 <b>Mijoz:</b> ${escape(order.customer_name)}`,`📞 <b>Telefon:</b> ${escape(order.phone)}`,order.extra_phone?`☎️ <b>Qo‘shimcha telefon:</b> ${escape(order.extra_phone)}`:'',`📍 <b>Viloyat:</b> ${escape(order.region)}`,`🏘 <b>Tuman/shahar:</b> ${escape(order.district)}`,order.address?`🏠 <b>Ko‘cha/uy:</b> ${escape(order.address)}`:'',order.notes?`📝 <b>Izoh:</b> ${escape(order.notes)}`:''].filter(Boolean).join('\n');
  try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7500);
    const response=await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:CHAT_ID,text:message,parse_mode:'HTML'}),signal:controller.signal});
    clearTimeout(timer);const result=await response.json();if(!result.ok)console.error('Telegram API error:',result.description);return Boolean(result.ok);
  }catch(e){console.error('Telegram send error:',e.message);return false;}
}
function serveStatic(req,res,p){
  let safe=p==='/'||p==='/admin'?'/index.html':p;
  try{safe=decodeURIComponent(safe);}catch{json(res,400,{error:'bad_path'});return;}
  if(safe.includes('..') || safe.includes('\\') || safe.startsWith('//')){json(res,403,{error:'forbidden'});return;}
  const file=path.join(PUBLIC,safe); if(!file.startsWith(PUBLIC+path.sep)){json(res,403,{error:'forbidden'});return;}
  fs.readFile(file,(e,bytes)=>{
    if(e){json(res,404,{error:'not_found'});return;}
    const mime=types[path.extname(file)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cache-Control':path.extname(file)==='.html'?'no-cache':'public, max-age=3600'});res.end(bytes);
  });
}
async function route(req,res){
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  const p=url.pathname, method=req.method;
  try{
    // Serve Three.js from our own deployment: third-party CDNs can be blocked,
    // leaving customers with the fallback photo instead of the 3D model.
    if(method==='GET' && p==='/vendor/three.module.js'){
      const modulePath=path.join(ROOT,'node_modules','three','build','three.module.js');
      return fs.readFile(modulePath,(err,bytes)=>{
        if(err)return json(res,404,{error:'module_not_found'});
        res.writeHead(200,{
          'Content-Type':'text/javascript; charset=utf-8',
          'X-Content-Type-Options':'nosniff',
          'Cache-Control':'public, max-age=86400'
        });
        res.end(bytes);
      });
    }
    if(method==='GET'&&p==='/api/health')return json(res,200,{ok:true});
    if(method==='GET'&&p==='/api/config')return json(res,200,{telegram_configured:Boolean(BOT_TOKEN&&CHAT_ID),demo_mode:!PRODUCTION});
    if(method==='GET'&&p==='/api/categories')return json(res,200,{categories:await catsQuery.all()});
    if(method==='GET'&&p==='/api/products'){
      const [products,promotions]=await Promise.all([
        publicProductsQuery.all(),db.prepare('SELECT * FROM promotions').all()
      ]);
      const promoMap=new Map(promotions.map(row=>[Number(row.product_id),row]));
      return json(res,200,{products:products.map(product=>productView(product,promoMap.get(Number(product.id))))});
    }
    const img=p.match(/^\/api\/products\/(\d+)\/image$/);
    if(method==='GET'&&img){const x=await db.prepare('SELECT image_blob,image_mime FROM products WHERE id=?').get(Number(img[1]));if(!x||!x.image_blob)return json(res,404,{error:'not_found'});res.writeHead(200,{'Content-Type':x.image_mime,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'});return res.end(x.image_blob);}
    if(method==='POST'&&p==='/api/orders'){
      if(!originOK(req))return json(res,403,{error:'forbidden'});
      if(!allow(orderAttempts,safeIp(req),8,30*60_000))return json(res,429,{error:'too_many_requests'});
      const v=await bodyJSON(req,15000);
      const id=number(v.product_id),qty=number(v.quantity,1);
      const name=clean(v.name,90),phone=clean(v.phone,24),extraPhone=clean(v.extra_phone,24),street=clean(v.address,240),notes=clean(v.notes,500);
      const selectedRegion=locations.regions.find(r=>r.id===number(v.region_id));
      const selectedDistrict=locations.districts.find(d=>d.id===number(v.district_id)&&d.region_id===selectedRegion?.id);
      const prod=await db.prepare('SELECT id,name_uz,price,old_price,active,stock FROM products WHERE id=?').get(id);
      const activePromotion=prod?await db.prepare('SELECT * FROM promotions WHERE product_id=?').get(id):null;
      const currentPrice=prod?effectiveProduct(prod,activePromotion).price:0;
      const digits=phone.replace(/\D/g,''),extraDigits=extraPhone.replace(/\D/g,'');
      if(!prod||!prod.active||prod.price<=0||(prod.old_price>0&&prod.old_price<=prod.price)||prod.stock<qty||qty<1||qty>20||name.length<3||
        digits.length<9||digits.length>15||(extraPhone&&(extraDigits.length<9||extraDigits.length>15))||
        !selectedRegion||!selectedDistrict)return json(res,400,{error:'invalid_order'});
      if(v.expected_unit_price!==undefined && Number(v.expected_unit_price)!==Number(currentPrice))return json(res,409,{error:'price_changed'});
      const region=selectedRegion.uz,district=selectedDistrict.uz;
      const total=currentPrice*qty;
      const r=await db.prepare('INSERT INTO orders (product_id,product_name,quantity,unit_price,total,customer_name,phone,address,region,district,extra_phone,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(id,prod.name_uz,qty,currentPrice,total,name,phone,street,region,district,extraPhone,notes);
      const order={id:Number(r.lastInsertRowid),product_name:prod.name_uz,quantity:qty,unit_price:prod.price,total,customer_name:name,phone,extra_phone:extraPhone,region,district,address:street,notes};
      const sent=await notifyTelegram(order);
      if(sent)await db.prepare('UPDATE orders SET telegram_sent=1 WHERE id=?').run(order.id);
      return json(res,201,{ok:true,order_id:order.id,telegram_sent:sent});
    }
    if(method==='POST'&&p==='/api/admin/login'){
      if(!originOK(req))return json(res,403,{error:'forbidden'});
      if(!allow(loginAttempts,safeIp(req),8,15*60_000))return json(res,429,{error:'too_many_requests'});
      const v=await bodyJSON(req,10000),user=clean(v.username,100),pw=String(v.password||'');
      const inputHash=crypto.createHash('sha256').update(user+'\0'+pw).digest();
      const goodHash=crypto.createHash('sha256').update(ADMIN_USER+'\0'+ADMIN_PASS).digest();
      if(!crypto.timingSafeEqual(inputHash,goodHash))return json(res,401,{error:'invalid_credentials'});
      const sessionInfo={user:ADMIN_USER,exp:Date.now()+12*60*60_000,csrf:crypto.randomBytes(20).toString('hex')};
      const data=Buffer.from(JSON.stringify(sessionInfo)).toString('base64url');
      return json(res,200,{ok:true,csrf:sign(sessionInfo.csrf)},{'Set-Cookie':`youme_session=${data}.${sign(data)}; Max-Age=43200; ${cookieProps(req)}`});
    }
    if(method==='GET'&&p==='/api/admin/session'){
      const s=session(req);return json(res,200,{logged_in:Boolean(s),username:s?.user||null,csrf:s?sign(s.csrf):null});
    }
    if(!p.startsWith('/api/admin/')){
      if(method==='GET'||method==='HEAD')return serveStatic(req,res,p);
      return json(res,404,{error:'not_found'});
    }
    const s=auth(req,res);if(!s)return;
    if(method!=='GET'&&(!originOK(req)||!csrfOK(req,s)))return json(res,403,{error:'csrf_failed'});
    if(method==='POST'&&p==='/api/admin/logout')return json(res,200,{ok:true},{'Set-Cookie':`youme_session=; Max-Age=0; ${cookieProps(req)}`});
    if(method==='GET'&&p==='/api/admin/dashboard'){
      const stats={products:(await db.prepare('SELECT COUNT(*) AS n FROM products').get()).n,categories:(await db.prepare('SELECT COUNT(*) AS n FROM categories').get()).n,orders:(await db.prepare('SELECT COUNT(*) AS n FROM orders').get()).n,new_orders:(await db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='new'").get()).n,total_sales:(await db.prepare("SELECT COALESCE(SUM(total),0) AS n FROM orders WHERE status IN ('accepted','shipped','done')").get()).n};
      return json(res,200,{stats});
    }
    if(method==='GET'&&p==='/api/admin/products')return json(res,200,{products:(await allProductsQuery.all()).map(product=>productView(product))});
    if(method==='GET'&&p==='/api/admin/promotions'){
      const offers=await db.prepare(`SELECT m.product_id,m.sale_price,m.starts_at,m.ends_at,
        p.name_uz,p.name_ru,p.price AS regular_price,p.stock,p.active
        FROM promotions m JOIN products p ON p.id=m.product_id ORDER BY m.ends_at DESC`).all();
      return json(res,200,{promotions:offers,server_now:new Date().toISOString()});
    }
    if(method==='POST'&&p==='/api/admin/promotions'){
      const input=await bodyJSON(req,16000);
      const id=number(input.product_id),salePrice=number(input.sale_price,-1);
      const start=promotionTime(input.starts_at),end=promotionTime(input.ends_at);
      const base=await db.prepare('SELECT id,price FROM products WHERE id=?').get(id);
      const now=Date.now();
      if(!base||!start||!end||salePrice<=0||salePrice>=Number(base.price)||
        Date.parse(start)>=Date.parse(end)||Date.parse(end)<=now||
        Date.parse(end)-Date.parse(start)>366*86400000){
        return json(res,400,{error:'invalid_promotion'});
      }
      await db.prepare(`INSERT INTO promotions(product_id,sale_price,starts_at,ends_at)
        VALUES(?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET
        sale_price=excluded.sale_price, starts_at=excluded.starts_at, ends_at=excluded.ends_at`)
        .run(id,salePrice,start,end);
      return json(res,200,{ok:true});
    }
    const promoMatch=p.match(/^\/api\/admin\/promotions\/(\d+)$/);
    if(method==='DELETE'&&promoMatch){
      const result=await db.prepare('DELETE FROM promotions WHERE product_id=?').run(Number(promoMatch[1]));
      return json(res,result.changes?200:404,{ok:Boolean(result.changes)});
    }
    if(method==='GET'&&p==='/api/admin/orders')return json(res,200,{orders:await db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 500').all()});
    const categoryMatch=p.match(/^\/api\/admin\/categories(?:\/(\d+))?$/);
    if(categoryMatch){const id=categoryMatch[1]?Number(categoryMatch[1]):null;
      if(method==='POST'&&!id){const v=await bodyJSON(req,9000),uz=clean(v.name_uz,80),icon=clean(v.icon,30),color=clean(v.color,30);if(!uz)return json(res,400,{error:'invalid_category'});const ru=await translateUzToRu(uz);const r=await db.prepare('INSERT INTO categories (name_uz,name_ru,icon,color) VALUES (?,?,?,?)').run(uz,ru,icon||'camera',color||'blue');return json(res,201,{id:Number(r.lastInsertRowid)});}
      if(method==='PUT'&&id){const v=await bodyJSON(req,9000),uz=clean(v.name_uz,80),icon=clean(v.icon,30),color=clean(v.color,30);if(!uz)return json(res,400,{error:'invalid_category'});const existing=await db.prepare('SELECT name_uz,name_ru FROM categories WHERE id=?').get(id);if(!existing)return json(res,404,{error:'not_found'});const ru=existing.name_uz===uz && existing.name_ru?existing.name_ru:await translateUzToRu(uz);const r=await db.prepare('UPDATE categories SET name_uz=?,name_ru=?,icon=?,color=? WHERE id=?').run(uz,ru,icon||'camera',color||'blue',id);return json(res,r.changes?200:404,{ok:Boolean(r.changes)});}
      if(method==='DELETE'&&id){if(await db.prepare('SELECT 1 FROM products WHERE category_id=? LIMIT 1').get(id))return json(res,409,{error:'category_has_products'});const r=await db.prepare('DELETE FROM categories WHERE id=?').run(id);return json(res,r.changes?200:404,{ok:Boolean(r.changes)});}
    }
    const productMatch=p.match(/^\/api\/admin\/products(?:\/(\d+))?$/);
    if(productMatch){const id=productMatch[1]?Number(productMatch[1]):null;
      if((method==='POST'&&!id)||(method==='PUT'&&id)){
        const v=await bodyJSON(req), existing=id?await db.prepare('SELECT id,name_uz,name_ru,description_uz,description_ru FROM products WHERE id=?').get(id):null;
        if(id&&!existing)return json(res,404,{error:'not_found'});
        const data=await validateProduct(v,existing), im=handleImage(v.image_data);
        if(method==='POST'){
          const r=await db.prepare(`INSERT INTO products(category_id,name_uz,name_ru,description_uz,description_ru,price,old_price,stock,image_url,image_blob,image_mime,featured,active)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(data.category_id,data.name_uz,data.name_ru,data.description_uz,data.description_ru,data.price,data.old_price,data.stock,data.image_url,im?.bytes||null,im?.mime||'',data.featured,data.active);
          return json(res,201,{id:Number(r.lastInsertRowid)});
        }
        
        const replaceImage=Boolean(im)||v.clear_image===true;
        const query=replaceImage?`UPDATE products SET category_id=?,name_uz=?,name_ru=?,description_uz=?,description_ru=?,price=?,old_price=?,stock=?,image_url=?,featured=?,active=?,image_blob=?,image_mime=?,demo=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`:`UPDATE products SET category_id=?,name_uz=?,name_ru=?,description_uz=?,description_ru=?,price=?,old_price=?,stock=?,image_url=?,featured=?,active=?,demo=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`;
        const args=[data.category_id,data.name_uz,data.name_ru,data.description_uz,data.description_ru,data.price,data.old_price,data.stock,data.image_url,data.featured,data.active];
        if(replaceImage)args.push(im?.bytes||null,im?.mime||'');args.push(id);
        await db.prepare(query).run(...args);return json(res,200,{ok:true});
      }
      if(method==='DELETE'&&id){const r=await db.prepare('DELETE FROM products WHERE id=?').run(id);return json(res,r.changes?200:404,{ok:Boolean(r.changes)});}
    }
    const orderMatch=p.match(/^\/api\/admin\/orders\/(\d+)$/);
    if(orderMatch&&method==='PATCH'){
      const v=await bodyJSON(req,10000),st=clean(v.status,30);
      if(!statuses.has(st))return json(res,400,{error:'invalid_status'});
      const r=await db.prepare('UPDATE orders SET status=? WHERE id=?').run(st,Number(orderMatch[1]));return json(res,r.changes?200:404,{ok:Boolean(r.changes)});
    }
    return json(res,404,{error:'not_found'});
  }catch(e){const status=e.status||500;console.error('HTTP error:',e.message);return json(res,status,{error:status===500?'server_error':e.message});}
}
initializeDatabase().then(()=>{http.createServer(route).listen(PORT,'0.0.0.0',()=>console.log(`YOU ME server listening on http://localhost:${PORT} (${DATABASE_URL?'Postgres':'SQLite'})`));}).catch(e=>{console.error('Database initialization failed:',e.message);process.exitCode=1;});
