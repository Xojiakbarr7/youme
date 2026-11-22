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
    // Actual camera body volume behind the photo-textured geometry.
    // The front photograph is authoritative for the product contours.
    roundedRect(3.28,1.12,.65,.48,black,upper,0,-.32,-.31);
    roundedRect(1.18,.94,.22,.21,metal,upper,0,-.32,-.25);
    for(const side of [-1,1]){
      const orb=new THREE.Mesh(new THREE.SphereGeometry(.53,30,22),black);
      orb.scale.set(1.35,1,.91);
      orb.position.set(side*1.27,-.30,-.34);
      upper.add(orb);
      const aerial=cylinder(.075,1.22,black,upper,side*.51,.92,-.20,20);
      cylinder(.105,.12,metal,upper,side*.51,.32,-.20);
      const top=cylinder(.078,.065,blue,upper,side*.51,1.55,-.20);
    }
    roundedRect(1.52,1.72,.78,.38,black,lower,0,0,-.39);
    roundedRect(1.35,1.28,.17,.25,metal,lower,0,-.06,-.31);
    cylinder(.58,.22,metal,upper,0,-.96,-.25);
    cylinder(.54,.26,black,lower,0,.85,-.30);
    [-1,1].forEach(v=>{
      const joint=cylinder(.26,.24,metal,lower,v*.77,-.10,-.3);
      joint.rotation.z=Math.PI/2;
    });
    // Photo-backed 3D surfaces. Split at the real motorized pan joint:
    // upper optics stay stable while lower PTZ gently swivels independently.
    const w=image.naturalWidth,h=image.naturalHeight;
    const split=Math.round(h*.656),overlap=Math.min(16,Math.round(h*.012));
    const imageWidth=4.55;
    const imageHeight=imageWidth*h/w;
    function photoPart(start,end,parent,centerY){
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=end-start;
      const context=canvas.getContext('2d');
      if(!context)throw Error('2D image context unavailable');
      context.drawImage(image,0,start,w,end-start,0,0,w,end-start);
      const texture=new THREE.CanvasTexture(canvas);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
      texture.needsUpdate=true;
      const hh=imageHeight*(end-start)/h;
      const face=new THREE.Mesh(
        new THREE.PlaneGeometry(imageWidth,hh,4,4),
        new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.04,side:THREE.DoubleSide,depthWrite:false})
      );
      face.position.set(0,centerY,.32);
      parent.add(face);
      return face;
    }
    const upperHeight=imageHeight*(split+overlap)/h;
    const lowerStart=split-overlap;
    const lowerHeight=imageHeight*(h-lowerStart)/h;
    photoPart(0,split+overlap,upper,(imageHeight-upperHeight)/2);
    lower.position.y=0;
    photoPart(lowerStart,h,lower,(imageHeight-lowerHeight)/2-imageHeight*lowerStart/h);
    // Position actual back lower housing behind lower lens based on photo coordinates.
    const lowerCenter=-.92;
    lower.children.forEach(object=>{
      if(object.isMesh&&object.material===black||object.isMesh&&object.material===metal){
        if(object.geometry.type==='ExtrudeGeometry' && object.position.y===0)object.position.y=lowerCenter;
      }
    });
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
      camera.position.z=sw<410?8.35:sw<670?8.15:7.9;
      camera.lookAt(0,.02,0);
      rig.scale.setScalar(sw<410?.83:sw<670?.94:1);
    }
    function schedule(){if(isVisible&&!document.hidden&&!scheduled){scheduled=true;requestAnimationFrame(render);}}
    function render(ms){
      scheduled=false;if(!isVisible||document.hidden)return;
      if(ms-last<30){schedule();return;}last=ms;resize();
      const tm=ms*.001;
      const want=target+(prefersReduced?0:Math.sin(tm*.43)*.028);
      pointer+=(want-pointer)*.07;
      upper.rotation.y=pointer;
      lower.rotation.y=pointer+(prefersReduced?0:Math.sin(tm*.63)*.085);
      upper.rotation.x=pointerY;
      lower.rotation.x=pointerY*.6;
      rig.position.y=prefersReduced?-.05:Math.sin(tm*.93)*.028-.05;
      renderer.render(scene,camera);
      schedule();
    }
    function down(ev){if(ev.pointerType==='mouse'&&ev.button!==0)return;drag=true;lastX=ev.clientX;stage.setPointerCapture?.(ev.pointerId);}
    function move(ev){
      if(drag){target=Math.max(-.26,Math.min(.26,target+(ev.clientX-lastX)*.004));lastX=ev.clientX;}
      else if(ev.pointerType==='mouse'){
        const b=stage.getBoundingClientRect();
        target=Math.max(-.22,Math.min(.22,(ev.clientX-b.left-b.width/2)/b.width*.35));
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
