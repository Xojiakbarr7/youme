'use strict';
/* YOU ME extras: scheduled-sale countdowns + customer FAQ / buying guidance
   + administrator's Neon-backed promotion schedule editor.
   Never invents product specs; draws current recommendations from the catalog. */
(()=>{
  const uz={
    chatButton:'Maslahat',chatTitle:'YOU ME yordamchisi',
    chatSubtitle:'Mahsulot tanlashda yordam',close:'Yopish',
    greeting:'Assalomu alaykum! Qanday mahsulot izlayapsiz? Narxlar va mavjud mahsulotlar katalogdan olinadi.',
    camera:'Kameralar',mattress:'Matraslar',chair:'Kreslolar',delivery:'Yetkazib berish',sale:'Aksiyalar',
    contact:'Telegram / Telefon',send:'Yuborish',placeholder:'Savolingizni yozing...',
    budget:'Qancha narxgacha qidiramiz?',b500:'500 minggacha',b1000:'1 milliongacha',ball:'Barchasi',
    results:'Katalogdan mos mahsulotlar:',empty:'Ushbu narx oralig‘ida narxi belgilangan mahsulot topilmadi.',
    none:'Hozir mos mahsulot topilmadi. Telegram orqali do‘kon bilan bog‘lanishingiz mumkin.',
    details:'Mahsulotni ko‘rish', deliveryReply:'O‘zbekiston bo‘ylab buyurtma berish mumkin. Yetkazish vaqti va shartlarini sotuvchi bilan aniqlashtiring.',
    saleReply:'Hozir amalda bo‘lgan chegirmalarni katalogdan tekshirib beraman.',
    unknown:'Savolingizni to‘liq aniqlay olmadim. Kameralar, matraslar, kreslolar, narx yoki yetkazish haqida so‘rashingiz mumkin.',
    phone:'Qo‘ng‘iroq qilish',telegram:'Telegramga o‘tish',
    priceUnknown:'Narx belgilanmagan',currency:'so‘m',
    promoHeading:'Vaqtli aksiyalar',promoDesc:'Oddiy narx o‘zgarmaydi. Belgilangan vaqtda chegirma yoqiladi, tugaganda oddiy narx qaytadi.',
    promoProduct:'Mahsulot',promoPrice:'Aksiya narxi (so‘m)',promoStart:'Boshlanishi',promoEnd:'Tugashi',promoSave:'Aksiyani saqlash',promoDelete:'O‘chirish',
    promoCurrent:'Oddiy narx',promoList:'Rejalashtirilgan aksiyalar',promoActive:'Faol',promoFuture:'Kutilmoqda',promoExpired:'Tugagan',
    promoSelect:'Mahsulotni tanlang',promoEmpty:'Hali vaqtli aksiya yo‘q.',promoInvalid:'Aksiya narxi oddiy narxdan kichik, tugash vaqti boshlanishdan keyin bo‘lishi shart.',
    promoSaved:'Aksiya saqlandi',promoRemoved:'Aksiya o‘chirildi',promoError:'Aksiyani saqlashda xatolik yuz berdi.',
    promoTime:'Vaqt kompyuteringizning mahalliy vaqtiga mos kiritiladi.',timeLeft:'Aksiya tugashiga',ended:'Aksiya tugadi',days:'kun',
    onlyPriced:'Avval mahsulotga oddiy narx kiriting.'
  };
  const ru={
    chatButton:'Помощь',chatTitle:'Помощник YOU ME',chatSubtitle:'Поможем выбрать товар',close:'Закрыть',
    greeting:'Здравствуйте! Что вы ищете? Рекомендации и цены берутся из актуального каталога.',
    camera:'Камеры',mattress:'Матрасы',chair:'Кресла',delivery:'Доставка',sale:'Акции',
    contact:'Telegram / Телефон',send:'Отправить',placeholder:'Введите вопрос...',
    budget:'Какой максимальный бюджет?',b500:'До 500 тысяч',b1000:'До 1 миллиона',ball:'Все товары',
    results:'Подходящие товары из каталога:',empty:'Среди товаров с указанной ценой подходящих вариантов нет.',
    none:'Сейчас нет подходящих товаров. Свяжитесь с магазином через Telegram.',
    details:'Посмотреть товар',deliveryReply:'Заказы принимаются по Узбекистану. Сроки и условия доставки уточняйте у продавца.',
    saleReply:'Проверю текущие скидки в каталоге.',
    unknown:'Не удалось точно понять вопрос. Спросите о камерах, матрасах, креслах, ценах или доставке.',
    phone:'Позвонить',telegram:'Перейти в Telegram',
    priceUnknown:'Цена не указана',currency:'сум',
    promoHeading:'Акции по расписанию',promoDesc:'Обычная цена сохраняется. Скидка действует по датам и автоматически отключается.',
    promoProduct:'Товар',promoPrice:'Цена по акции (сум)',promoStart:'Начало',promoEnd:'Окончание',promoSave:'Сохранить акцию',promoDelete:'Удалить',
    promoCurrent:'Обычная цена',promoList:'Запланированные акции',promoActive:'Активна',promoFuture:'Ожидается',promoExpired:'Завершена',
    promoSelect:'Выберите товар',promoEmpty:'Акций по расписанию пока нет.',promoInvalid:'Цена акции должна быть ниже обычной, дата окончания — позже начала.',
    promoSaved:'Акция сохранена',promoRemoved:'Акция удалена',promoError:'Не удалось сохранить акцию.',
    promoTime:'Время вводится по часовому поясу вашего устройства.',timeLeft:'До конца акции',ended:'Акция закончилась',days:'дн.',
    onlyPriced:'Сначала укажите обычную цену товара.'
  };
  const T=()=>state.lang==='ru'?ru:uz;
  const fmt=n=>Number(n).toLocaleString('ru-RU').replace(/[\u00a0\u202f]/g,' ')+' '+T().currency;
  const name=p=>p?.['name_'+state.lang]||p?.name_uz||'';
  const enc=str=>String(str??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateLocal=s=>{
    if(!s)return '';
    const d=new Date(s);if(!Number.isFinite(d.getTime()))return '';
    const p=n=>String(n).padStart(2,'0');
    return [d.getFullYear(),p(d.getMonth()+1),p(d.getDate())].join('-')+'T'+p(d.getHours())+':'+p(d.getMinutes());
  };
  const datePretty=s=>new Date(s).toLocaleString(state.lang==='ru'?'ru-RU':'uz-UZ',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  function makeAdvisor(){
    const host=document.querySelector('#shopApp');if(!host)return;
    const section=document.createElement('section');
    section.className='ym-help-root';
    section.innerHTML='<button type="button" class="ym-help-fab" id="ymHelpFab" aria-expanded="false" aria-controls="ymHelpPanel">✦ <span></span></button>'+
      '<div class="ym-help-panel" id="ymHelpPanel" hidden role="dialog" aria-label="YOU ME yordamchisi">'+
      '<header class="ym-help-head"><div><strong id="ymHelpTitle"></strong><small id="ymHelpSub"></small></div><button type="button" id="ymHelpClose" aria-label="Yopish">×</button></header>'+
      '<div class="ym-help-messages" id="ymHelpMessages" aria-live="polite"></div>'+
      '<div class="ym-help-choices" id="ymHelpChoices"></div>'+
      '<form class="ym-help-form" id="ymHelpForm"><input id="ymHelpInput" maxlength="200" autocomplete="off" aria-label="Savol" required><button type="submit" id="ymHelpSend"></button></form>'+
      '<div class="ym-help-links"><a href="https://t.me/youmeuz" rel="noopener noreferrer" target="_blank" id="ymHelpTelegram"></a><a href="tel:+998900183344" id="ymHelpPhone"></a></div></div>';
    host.appendChild(section);
    const get=id=>section.querySelector('#'+id);
    const fab=get('ymHelpFab'),panel=get('ymHelpPanel'),messages=get('ymHelpMessages'),buttons=get('ymHelpChoices');
    let open=false,mode='all';
    function say(message,mine=false){
      const el=document.createElement('div');
      el.className='ym-help-message '+(mine?'is-user':'is-helper');
      el.textContent=message;messages.appendChild(el);messages.scrollTop=messages.scrollHeight;
    }
    function quickOptions(options){
      buttons.replaceChildren();
      for(const [value,label] of options){
        const btn=document.createElement('button');
        btn.type='button';btn.dataset.helpAction=value;btn.textContent=label;buttons.appendChild(btn);
      }
    }
    function drawLabels(){
      get('ymHelpTitle').textContent=T().chatTitle;
      get('ymHelpSub').textContent=T().chatSubtitle;
      fab.querySelector('span').textContent=T().chatButton;
      get('ymHelpInput').placeholder=T().placeholder;
      get('ymHelpSend').textContent=T().send;
      get('ymHelpTelegram').textContent=T().telegram;
      get('ymHelpPhone').textContent=T().phone;
    }
    function basicOptions(){
      quickOptions([['camera',T().camera],['mattress',T().mattress],['chair',T().chair],['sale',T().sale],['delivery',T().delivery]]);
    }
    function reset(){
      drawLabels();messages.replaceChildren();say(T().greeting);basicOptions();
    }
    function toggle(next){
      open=next;panel.hidden=!open;fab.setAttribute('aria-expanded',String(open));
      if(open){if(!messages.children.length)reset();get('ymHelpInput').focus({preventScroll:true});}
    }
    const categoryFor=(p,type)=>{
      const cat=state.categories.find(c=>Number(c.id)===Number(p.category_id));
      const s=(p.name_uz+' '+(cat?.name_uz||'')).toLowerCase();
      if(type==='camera')return /kamera|kuzatuv/.test(s);
      if(type==='mattress')return /matras/.test(s);
      if(type==='chair')return /kreslo/.test(s);
      return true;
    };
    function cards(matches){
      const list=matches.slice(0,4);
      if(!list.length){say(T().empty);return;}
      say(T().results);
      const wrap=document.createElement('div');wrap.className='ym-help-products';
      for(const p of list){
        const btn=document.createElement('button');btn.type='button';btn.className='ym-help-product';btn.dataset.helpProduct=String(p.id);
        btn.textContent=name(p)+' · '+(Number(p.price)>0?fmt(p.price):T().priceUnknown);
        wrap.appendChild(btn);
      }
      messages.appendChild(wrap);messages.scrollTop=messages.scrollHeight;
    }
    function recommend(type,budget=Infinity){
      const products=state.products.filter(p=>Number(p.active)!==0&&Number(p.stock)>0&&Number(p.price)>0&&categoryFor(p,type)
        &&p.price<=budget).sort((a,b)=>Number(a.price)-Number(b.price));
      cards(products);basicOptions();
    }
    function action(type){
      if(['camera','mattress','chair'].includes(type)){
        mode=type;say(T().budget);
        quickOptions([['budget500',T().b500],['budget1000',T().b1000],['budgetAll',T().ball]]);
      }else if(type.startsWith('budget')){
        recommend(mode,type==='budget500'?500000:type==='budget1000'?1000000:Infinity);
      }else if(type==='sale'){
        say(T().saleReply);
        cards(state.products.filter(p=>Number(p.stock)>0&&Number(p.old_price)>Number(p.price)&&Number(p.price)>0)
          .sort((a,b)=>a.price-b.price));
        basicOptions();
      }else if(type==='delivery'){
        say(T().deliveryReply);basicOptions();
      }
    }
    function answer(q){
      const text=q.toLowerCase();
      if(/yetkaz|dostav|достав|shipping|manzil/.test(text))action('delivery');
      else if(/aksiya|chegirma|акци|скидк|sale/.test(text))action('sale');
      else if(/matras|матрас/.test(text))action('mattress');
      else if(/kreslo|кресл|puf/.test(text))action('chair');
      else if(/kamera|камер|wifi|wi-fi|4g|v380|narx|цена/.test(text))action('camera');
      else{say(T().unknown);basicOptions();}
    }
    fab.addEventListener('click',()=>toggle(!open));
    get('ymHelpClose').addEventListener('click',()=>toggle(false));
    buttons.addEventListener('click',e=>{const el=e.target.closest('[data-help-action]');if(el)action(el.dataset.helpAction);});
    messages.addEventListener('click',e=>{
      const el=e.target.closest('[data-help-product]');
      if(el&&typeof openDetail==='function'){toggle(false);openDetail(Number(el.dataset.helpProduct));}
    });
    get('ymHelpForm').addEventListener('submit',e=>{
      e.preventDefault();const input=get('ymHelpInput'),q=input.value.trim();
      if(!q)return;say(q,true);input.value='';answer(q);
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)toggle(false)});
    const ob=new MutationObserver(()=>{if(!open){drawLabels();return;}reset();});
    ob.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    drawLabels();
  }
  function setupCountdown(){
    if(location.pathname==='/admin')return;
    const grid=document.getElementById('productsGrid'),detail=document.getElementById('detailBody');
    function inject(){
      for(const item of grid?.querySelectorAll('.product-card')||[]){
        const id=Number(item.querySelector('[data-detail]')?.dataset.detail);
        const p=state.products.find(p=>Number(p.id)===id);
        const mount=item.querySelector('.product-price-line');
        if(!mount)continue;
        const existing=mount.querySelector('.ym-promo-clock');
        if(p?.sale_ends_at){
          if(existing?.dataset.endsAt===p.sale_ends_at)continue;
          existing?.remove();
          const el=document.createElement('div');el.className='ym-promo-clock';el.dataset.endsAt=p.sale_ends_at;mount.insertBefore(el,mount.querySelector('.in-stock'));
        }else existing?.remove();
      }
      if(detail){
        const productId=Number(detail.querySelector('[data-order]')?.dataset.order);
        const p=state.products.find(p=>Number(p.id)===productId);
        let item=detail.querySelector('.ym-promo-clock');
        if(p?.sale_ends_at&&detail.querySelector('.detail-price-wrap')){
          if(item?.dataset.endsAt!==p.sale_ends_at){
            item?.remove();item=document.createElement('div');item.className='ym-promo-clock';
            item.dataset.endsAt=p.sale_ends_at;detail.querySelector('.detail-price-wrap').appendChild(item);
          }
        }else item?.remove();
      }
      tick();
    }
    let refreshing=false,lastRefreshed=0;
    async function updatePrices(){
      if(refreshing||Date.now()-lastRefreshed<5000)return;
      lastRefreshed=Date.now();refreshing=true;
      try{
        const data=await api('/api/products');
        state.products=data.products;renderProducts();
      }catch(e){console.debug('Price refresh unavailable:',e.message)}
      finally{refreshing=false;}
    }
    function tick(){
      const now=Date.now();
      for(const el of document.querySelectorAll('.ym-promo-clock')){
        const seconds=Math.max(0,Math.ceil((Date.parse(el.dataset.endsAt)-now)/1000));
        if(seconds<=0){el.textContent=T().ended;updatePrices();continue;}
        const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
        el.textContent=T().timeLeft+': '+(d?d+' '+T().days+' ':'')+[h,m,s].map(x=>String(x).padStart(2,'0')).join(':');
      }
    }
    if(grid)new MutationObserver(inject).observe(grid,{childList:true,subtree:false});
    if(detail)new MutationObserver(inject).observe(detail,{childList:true,subtree:false});
    setInterval(tick,1000);
    setInterval(()=>{if(!document.hidden)updatePrices();},60000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)updatePrices();});
    inject();
  }
  function setupAdminPromotions(){
    const page=document.querySelector('#page-products');if(!page)return;
    const wrap=document.createElement('section');
    wrap.className='ym-promos admin-white-card';
    wrap.id='ymPromoManager';
    wrap.innerHTML='<div class="ym-promo-heading"><h3 id="ymPromoTitle"></h3><p id="ymPromoSubtitle"></p></div>'+
      '<form id="ymPromoForm" class="ym-promo-form">'+
      '<label><span id="ymPromoProductLabel"></span><select id="ymPromoProduct" required></select></label>'+
      '<label><span id="ymPromoPriceLabel"></span><input id="ymPromoPrice" type="number" min="1" step="1" required></label>'+
      '<label><span id="ymPromoStartLabel"></span><input id="ymPromoStart" type="datetime-local" required></label>'+
      '<label><span id="ymPromoEndLabel"></span><input id="ymPromoEnd" type="datetime-local" required></label>'+
      '<div class="ym-promo-row"><small id="ymPromoCurrentPrice"></small><button type="submit" class="button button-primary" id="ymPromoSave"></button></div></form>'+
      '<p id="ymPromoTimeHint" class="ym-promo-hint"></p>'+
      '<h4 id="ymPromoListTitle"></h4><div id="ymPromoList" class="ym-promo-list"></div>';
    page.insertBefore(wrap,page.querySelector('.admin-white-card')||null);
    const $id=id=>wrap.querySelector('#'+id);
    let promotions=[],loaded=false,busy=false;
    function selectProduct(){
      const chosen=state.adminProducts.find(p=>String(p.id)===$id('ymPromoProduct').value);
      $id('ymPromoCurrentPrice').textContent=chosen?T().promoCurrent+': '+fmt(chosen.price):'';
      const promo=promotions.find(p=>String(p.product_id)===$id('ymPromoProduct').value);
      if(promo){
        $id('ymPromoPrice').value=promo.sale_price;
        $id('ymPromoStart').value=dateLocal(promo.starts_at);
        $id('ymPromoEnd').value=dateLocal(promo.ends_at);
      }else{
        $id('ymPromoPrice').value='';
        $id('ymPromoStart').value=dateLocal(Date.now()-60000);
        $id('ymPromoEnd').value=dateLocal(Date.now()+86400000);
      }
    }
    function labels(){
      $id('ymPromoTitle').textContent=T().promoHeading;
      $id('ymPromoSubtitle').textContent=T().promoDesc;
      $id('ymPromoProductLabel').textContent=T().promoProduct;
      $id('ymPromoPriceLabel').textContent=T().promoPrice;
      $id('ymPromoStartLabel').textContent=T().promoStart;
      $id('ymPromoEndLabel').textContent=T().promoEnd;
      $id('ymPromoSave').textContent=T().promoSave;
      $id('ymPromoListTitle').textContent=T().promoList;
      $id('ymPromoTimeHint').textContent=T().promoTime;
    }
    function render(){
      const selected=$id('ymPromoProduct').value;
      labels();
      $id('ymPromoProduct').innerHTML='<option value="">'+enc(T().promoSelect)+'</option>'+
        state.adminProducts.map(p=>'<option value="'+Number(p.id)+'">'+enc(name(p))+' · '+enc(fmt(p.price))+'</option>').join('');
      $id('ymPromoProduct').value=selected&&state.adminProducts.some(p=>String(p.id)===selected)?selected:'';
      $id('ymPromoList').innerHTML=promotions.length?promotions.map(p=>{
        const now=Date.now(),start=Date.parse(p.starts_at),end=Date.parse(p.ends_at);
        const status=now<start?'promoFuture':now>=end?'promoExpired':'promoActive';
        return '<div class="ym-promo-item"><div><strong>'+enc(name(p))+'</strong><small>'+
        enc(T()[status])+' · '+enc(fmt(p.regular_price))+' → '+enc(fmt(p.sale_price))+
        '</small><small>'+enc(datePretty(p.starts_at))+' — '+enc(datePretty(p.ends_at))+'</small></div>'+
        '<div class="ym-promo-actions"><button type="button" data-promo-edit="'+Number(p.product_id)+'">'+enc(T().promoProduct)+'</button>'+
        '<button type="button" class="ym-promo-remove" data-promo-delete="'+Number(p.product_id)+'">'+enc(T().promoDelete)+'</button></div></div>';
      }).join(''):'<p class="ym-promo-empty">'+enc(T().promoEmpty)+'</p>';
      if($id('ymPromoProduct').value)selectProduct();
    }
    async function refresh(){
      if(!state.logged||busy)return;
      busy=true;
      try{
        const response=await api('/api/admin/promotions');
        promotions=response.promotions||[];loaded=true;render();
      }catch(e){console.warn('Promotion manager:',e.message);}
      finally{busy=false;}
    }
    $id('ymPromoProduct').addEventListener('change',selectProduct);
    $id('ymPromoForm').addEventListener('submit',async evt=>{
      evt.preventDefault();const id=Number($id('ymPromoProduct').value);
      const product=state.adminProducts.find(p=>Number(p.id)===id);
      const sale=Number($id('ymPromoPrice').value),start=new Date($id('ymPromoStart').value),end=new Date($id('ymPromoEnd').value);
      if(!product||product.price<=0){toast(T().onlyPriced);return;}
      if(!Number.isSafeInteger(sale)||sale<=0||sale>=Number(product.price)||
        !Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>=end||end<=new Date()){
        toast(T().promoInvalid);return;
      }
      const button=$id('ymPromoSave');button.disabled=true;
      try{
        await api('/api/admin/promotions',{method:'POST',body:{
          product_id:id,sale_price:sale,starts_at:start.toISOString(),ends_at:end.toISOString()
        }});
        toast(T().promoSaved);await refresh();
      }catch(e){toast(T().promoError+' ('+e.message+')');}
      finally{button.disabled=false;}
    });
    $id('ymPromoList').addEventListener('click',async evt=>{
      const edit=evt.target.closest('[data-promo-edit]');
      if(edit){
        $id('ymPromoProduct').value=edit.dataset.promoEdit;selectProduct();
        $id('ymPromoForm').scrollIntoView({behavior:'smooth',block:'center'});return;
      }
      const del=evt.target.closest('[data-promo-delete]');if(!del)return;
      if(!window.confirm(T().promoDelete+'?'))return;
      try{await api('/api/admin/promotions/'+Number(del.dataset.promoDelete),{method:'DELETE'});toast(T().promoRemoved);await refresh();}
      catch(e){toast(T().promoError);}
    });
    document.addEventListener('click',evt=>{
      if(evt.target.closest('[data-page="products"]'))setTimeout(refresh,0);
    });
    new MutationObserver(()=>{if(state.logged&&state.page==='products')refresh();})
      .observe(document.getElementById('adminLayout'),{attributes:true,attributeFilter:['hidden']});
    new MutationObserver(()=>{if(loaded&&state.page==='products')render();})
      .observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    labels();
  }
  if(location.pathname==='/admin')setupAdminPromotions();
  else{makeAdvisor();setupCountdown();}
})();
