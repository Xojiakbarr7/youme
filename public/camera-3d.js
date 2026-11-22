'use strict';
/* YOU ME accurate product showcase.
   The actual catalog photograph is split into upper and lower photo-textured
   surfaces on a layered Three.js model. Only gentle parallax/tilt is allowed:
   this preserves the exact three-eye body, dual antennas, and PTZ lower lens.
   No image substitution, invented housing, or fake 360 degree spin. */
(function () {
  const stage=document.getElementById('camera3dStage');
  if(!stage)return;
  const fallback=stage.querySelector('.hero-camera-fallback');
  if(fallback)fallback.src='/assets/youme_promo_camera.webp';
  const prefersReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const source='/assets/youme_promo_camera.webp';
  let initiated=false;
  async function launch(){
    if(initiated)return;
    initiated=true;
    let THREE;
    try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');}
    catch(e){try{THREE=await import('https://unpkg.com/three@0.161.0/build/three.module.js');}
    catch(e2){console.info('YOU ME 3D unavailable; precise product photo remains visible.');return;}}
    let image=fallback;
    try{
      if(!image){image=new Image();image.src=source;}
      await image.decode();
      if(!image.naturalWidth || !image.naturalHeight)throw Error('missing image pixels');
    }catch(e){console.info('Product image unavailable for WebGL:',e.message);return;}
    let renderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}
    catch(e){console.info('WebGL unsupported; original product photo preserved.');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
    renderer.setClearColor(0,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.4;
    renderer.domElement.className='hero-camera-canvas';
    renderer.domElement.setAttribute('aria-hidden','true');
    stage.prepend(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(39,1,.1,100);
    camera.position.set(0,0,8.15);
    camera.lookAt(0,0,0);
    const hemi=new THREE.HemisphereLight(0xd5e6ff,0x09213d,3);
    scene.add(hemi);
    const key=new THREE.DirectionalLight(0xb8dfff,3);
    key.position.set(-3,4,6);scene.add(key);
    const rim=new THREE.DirectionalLight(0x227bff,6);
    rim.position.set(3,1,-3);scene.add(rim);
    const rig=new THREE.Group();scene.add(rig);
    const upper=new THREE.Group(),lower=new THREE.Group();
    rig.add(upper);rig.add(lower);
    const black=new THREE.MeshStandardMaterial({color:0x0b111d,metalness:.76,roughness:.24});
    const metal=new THREE.MeshStandardMaterial({color:0x434d59,metalness:.88,roughness:.21});
    const blue=new THREE.MeshStandardMaterial({color:0x164475,metalness:.75,roughness:.21});
    function roundedRect(w,h,d,r,material,parent,x,y,z){
      const shape=new THREE.Shape(),l=-w/2,b=-h/2;
      shape.moveTo(l+r,b);shape.lineTo(l+w-r,b);
      shape.quadraticCurveTo(l+w,b,l+w,b+r);
      shape.lineTo(l+w,b+h-r);shape.quadraticCurveTo(l+w,b+h,l+w-r,b+h);
      shape.lineTo(l+r,b+h);shape.quadraticCurveTo(l,b+h,l,b+h-r);
      shape.lineTo(l,b+r);shape.quadraticCurveTo(l,b,l+r,b);
      const bevel=.035;
      const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*bevel,steps:1,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:4,curveSegments:7});
      geo.translate(0,0,-(d-2*bevel)/2);
      const mesh=new THREE.Mesh(geo,material);
      mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    }
    function cylinder(radius,length,material,parent,x,y,z,segments=24){
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,segments),material);
      mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    }

    // All major optical housings, lens modules, motors, antennae are real 3D meshes.
    // The source photograph only provides small photo-real faceplate materials.
    const chromeMat=new THREE.MeshPhysicalMaterial({color:0x9ba9b9,metalness:.9,roughness:.18,clearcoat:.55});
    const gunmetalMat=new THREE.MeshPhysicalMaterial({color:0x303848,metalness:.75,roughness:.27,clearcoat:.4});
    const softBodyMat=new THREE.MeshPhysicalMaterial({color:0x141923,metalness:.42,roughness:.29,clearcoat:.35});
    const maskMat=new THREE.MeshStandardMaterial({color:0x06080f,roughness:.55});
    const diodeMat=new THREE.MeshStandardMaterial({color:0xffefca,emissive:0xffcf8a,emissiveIntensity:1.65});
    const lensGlassMat=new THREE.MeshPhysicalMaterial({color:0x18458d,metalness:.45,roughness:.055,clearcoat:1});
    const irisMat=new THREE.MeshPhysicalMaterial({color:0x010916,metalness:.24,roughness:.04,clearcoat:1});
    function orb3(x,y,z,rx,ry,rz,m,p){
      const o=new THREE.Mesh(new THREE.SphereGeometry(1,42,26),m);
      o.position.set(x,y,z);o.scale.set(rx,ry,rz);p.add(o);return o;
    }
    function disk3(r,d,m,p,x,y,z){
      const o=cylinder(r,d,m,p,x,y,z,60);o.rotation.x=Math.PI/2;return o;
    }
    function torus3(r,d,m,p,x,y,z){
      const o=new THREE.Mesh(new THREE.TorusGeometry(r,d,9,54),m);
      o.position.set(x,y,z);p.add(o);return o;
    }
    function face3(p,bounds,w,h,x,y,z){
      const can=document.createElement('canvas');can.width=360;can.height=Math.round(360*h/w);
      const ctx=can.getContext('2d');if(!ctx)return;
      ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(0,0,can.width,can.height,32);
      else ctx.rect(0,0,can.width,can.height);
      ctx.clip();
      ctx.drawImage(image,...bounds,0,0,can.width,can.height);
      const t=new THREE.CanvasTexture(can);
      t.colorSpace=THREE.SRGBColorSpace;
      t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
      const mesh=new THREE.Mesh(
       new THREE.PlaneGeometry(w,h),
       new THREE.MeshBasicMaterial({map:t,transparent:true,alphaTest:.04,depthWrite:false})
      );
      mesh.position.set(x,y,z);p.add(mesh);
    }
    function lens3(p,x,y,z,r){
      disk3(r*1.24,.10,gunmetalMat,p,x,y,z);
      disk3(r*1.02,.09,maskMat,p,x,y,z+.065);
      torus3(r*.95,r*.045,chromeMat,p,x,y,z+.14);
      disk3(r*.75,.062,lensGlassMat,p,x,y,z+.16);
      disk3(r*.46,.040,irisMat,p,x,y,z+.204);
      torus3(r*.42,r*.018,blue,p,x,y,z+.23);
      orb3(x-r*.12,y+r*.12,z+.247,r*.12,r*.10,.012,chromeMat,p);
    }
    function led3(p,x,y,z,r){
      disk3(r*1.21,.027,gunmetalMat,p,x,y,z);
      disk3(r,.044,diodeMat,p,x,y,z+.034);
      orb3(x-r*.2,y+r*.18,z+.072,r*.36,r*.32,r*.14,chromeMat,p);
    }
    // Unified silver curved upper body. No black blob behind an image plane.
    roundedRect(4.22,1.16,.96,.41,chromeMat,upper,0,.66,-.34);
    roundedRect(4.13,.16,.95,.075,chromeMat,upper,0,1.24,-.33);
    roundedRect(4.13,.16,.95,.075,gunmetalMat,upper,0,.09,-.33);
    for(const x of [-.72,.72]){
      cylinder(.12,.18,chromeMat,upper,x,1.37,-.34,24);
      cylinder(.091,1.49,softBodyMat,upper,x,2.22,-.34,28);
      cylinder(.10,.09,gunmetalMat,upper,x,3.02,-.34,24);
      orb3(x,3.09,-.34,.097,.1,.097,maskMat,upper);
      for(let k=0;k<4;k++)cylinder(.101,.026,maskMat,upper,x,1.80+k*.15,-.34,24);
    }
    function optic3(x,center){
      const y=.66,w=center?1.37:1.17,h=center?1.25:1.13;
      if(center){
        roundedRect(1.6,1.4,.95,.30,chromeMat,upper,0,y,-.16);
        roundedRect(1.52,1.29,.17,.24,gunmetalMat,upper,0,y,.52);
      }else{
        orb3(x,y,-.19,.77,.73,.66,chromeMat,upper);
        roundedRect(1.29,1.19,.72,.31,gunmetalMat,upper,x,y,.06);
      }
      roundedRect(w+.16,h+.15,.20,.28,chromeMat,upper,x,y,.58);
      roundedRect(w+.08,h+.08,.11,.25,maskMat,upper,x,y,.70);
      roundedRect(w,h,.068,.22,softBodyMat,upper,x,y,.78);
      face3(upper,center?[472,390,303,269]:x<0?[211,386,232,259]:[816,386,234,259],w-.05,h-.05,x,y,.83);
      lens3(upper,x,y,.88,center?.228:.216);
      const n=center?10:6;
      for(let i=0;i<n;i++){
        let lx,ly;
        if(center){const th=Math.PI*2*i/n+.28;lx=x+Math.cos(th)*.4;ly=y+Math.sin(th)*.42;}
        else{lx=x+(i%3-1)*.212;ly=y+(i<3?.39:-.39);}
        led3(upper,lx,ly,.85,center?.062:.071);
      }
      if(center)for(const dx of [-.61,.61])for(const dy of [-.52,.52]){
        disk3(.036,.025,chromeMat,upper,dx,y+dy,.866);
        roundedRect(.037,.007,.008,.003,maskMat,upper,dx,y+dy,.891);
      }
    }
    optic3(-1.49,false);optic3(0,true);optic3(1.49,false);
    // Real separated motor bearing and PTZ head.
    cylinder(.91,.44,chromeMat,upper,0,-.20,-.27,44);
    cylinder(.88,.07,gunmetalMat,upper,0,-.47,-.27,44);
    cylinder(.72,.17,maskMat,upper,0,-.60,-.27,44);
    lower.position.set(0,-.72,-.13);
    orb3(0,-.93,-.32,.86,1.05,.69,gunmetalMat,lower);
    roundedRect(1.66,1.79,.80,.39,softBodyMat,lower,0,-1.02,-.07);
    roundedRect(1.46,1.56,.17,.31,chromeMat,lower,0,-1.03,.41);
    roundedRect(1.35,1.44,.11,.26,maskMat,lower,0,-1.03,.53);
    roundedRect(1.25,1.31,.08,.21,softBodyMat,lower,0,-1.04,.62);
    face3(lower,[488,837,275,337],1.17,1.22,0,-1.04,.71);
    lens3(lower,0,-.68,.77,.208);
    for(let row=0;row<2;row++)for(let col=0;col<5;col++){
      const x=(col-2)*.185,y=-1.35-row*.15;
      roundedRect(.14,.12,.048,.027,chromeMat,lower,x,y,.755);
      led3(lower,x,y,.80,.032);
    }
    for(const [x,y] of [[-.4,-1.73],[-.13,-1.78],[.13,-1.78],[.4,-1.73]])led3(lower,x,y,.80,.08);
    for(const sign of [-1,1]){
      const hub=cylinder(.29,.27,chromeMat,lower,sign*.83,-1.01,-.32,40);
      hub.rotation.z=Math.PI/2;
      const cap=cylinder(.25,.04,gunmetalMat,lower,sign*.99,-1.01,-.32,40);
      cap.rotation.z=Math.PI/2;
    }
    // Underneath the genuine product, a soft photometric showroom reflection.
    const glow=new THREE.Mesh(
      new THREE.CircleGeometry(1.85,60),
      new THREE.MeshBasicMaterial({color:0x0b8eff,transparent:true,opacity:.11,depthWrite:false,side:THREE.DoubleSide})
    );
    glow.scale.set(1,.14,1);
    glow.position.set(0,-2.13,-.8);
    rig.add(glow);
    let isVisible=true,scheduled=false,last=0,pointer=0,target=0,pointerY=0,drag=false,lastX=0,width=0,height=0;
    function resize(){
      const b=stage.getBoundingClientRect();
      const sw=Math.max(2,Math.floor(b.width)),sh=Math.max(2,Math.floor(b.height));
      if(sw===width&&sh===height)return;
      width=sw;height=sh;
      renderer.setSize(sw,sh,false);camera.aspect=sw/sh;camera.updateProjectionMatrix();
      camera.position.z=sw<410?9.5:sw<670?9.35:8.85;
      camera.lookAt(0,.02,0);
      rig.scale.setScalar(sw<410?.72:sw<670?.83:.96);
    }
    function schedule(){if(isVisible&&!document.hidden&&!scheduled){scheduled=true;requestAnimationFrame(render);}}
    function render(ms){
      scheduled=false;if(!isVisible||document.hidden)return;
      if(ms-last<30){schedule();return;}last=ms;resize();
      const tm=ms*.001;
      const want=target+(prefersReduced?0:Math.sin(tm*.43)*.09);
      pointer+=(want-pointer)*.07;
      upper.rotation.y=pointer;
      lower.rotation.y=pointer+(prefersReduced?0:Math.sin(tm*.63)*.23);
      upper.rotation.x=pointerY;
      lower.rotation.x=pointerY*.6;
      rig.position.y=prefersReduced?-.05:Math.sin(tm*.93)*.028-.05;
      renderer.render(scene,camera);
      schedule();
    }
    function down(ev){if(ev.pointerType==='mouse'&&ev.button!==0)return;drag=true;lastX=ev.clientX;stage.setPointerCapture?.(ev.pointerId);}
    function move(ev){
      if(drag){target=Math.max(-.92,Math.min(.92,target+(ev.clientX-lastX)*.007));lastX=ev.clientX;}
      else if(ev.pointerType==='mouse'){
        const b=stage.getBoundingClientRect();
        target=Math.max(-.65,Math.min(.65,(ev.clientX-b.left-b.width/2)/b.width*1.1));
        pointerY=Math.max(-.06,Math.min(.06,-(ev.clientY-b.top-b.height/2)/b.height*.09));
      }
    }
    stage.addEventListener('pointerdown',down);
    stage.addEventListener('pointermove',move);
    stage.addEventListener('pointerup',()=>drag=false);
    stage.addEventListener('pointercancel',()=>drag=false);
    stage.addEventListener('pointerleave',()=>{if(!drag){target=0;pointerY=0;}});
    if('IntersectionObserver'in window)new IntersectionObserver(entries=>{isVisible=Boolean(entries[0]?.isIntersecting);if(isVisible)schedule();},{threshold:.03}).observe(stage);
    if('ResizeObserver'in window)new ResizeObserver(()=>{resize();schedule()}).observe(stage);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
    resize();
    renderer.render(scene,camera);
    stage.classList.add('is-3d-ready');
    schedule();
  }
  if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{
      if(entries[0]?.isIntersecting){observer.disconnect();launch().catch(e=>console.warn('YOU ME image-based 3D fallback:',e.message));}
    },{rootMargin:'160px'});
    observer.observe(stage);
  }else launch().catch(e=>console.warn('YOU ME 3D fallback:',e.message));
})();
