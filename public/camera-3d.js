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
    // Real product proportions: keep the dark moulded body INSIDE the photograph silhouette.
    // Bulky spheres from the earlier model have been removed.
    roundedRect(3.47,1.05,.53,.39,black,upper,0,.40,-.63);
    roundedRect(1.24,.93,.35,.19,metal,upper,0,.42,-.56);
    for(const x of [-1.29,1.29]){
      const sideShell=new THREE.Mesh(new THREE.SphereGeometry(.41,32,20),black);
      sideShell.scale.set(1.35,1.04,.88);
      sideShell.position.set(x,.43,-.62);
      upper.add(sideShell);
    }
    // Two actual antennas, aligned precisely with the product photo.
    for(const x of [-.52,.52]){
      cylinder(.069,1.17,black,upper,x,1.59,-.53,22);
      cylinder(.090,.09,metal,upper,x,1.03,-.53);
      cylinder(.073,.052,blue,upper,x,2.20,-.53);
    }
    // Rotating PTZ body under the horizontal camera bar.
    roundedRect(1.45,1.65,.52,.35,black,lower,0,-1.23,-.58);
    roundedRect(1.30,1.16,.21,.23,metal,lower,0,-1.21,-.50);
    cylinder(.60,.24,metal,upper,0,-.37,-.58);
    cylinder(.50,.17,black,lower,0,-.43,-.58);
    [-1,1].forEach(v=>{
      const pivot=cylinder(.23,.25,metal,lower,v*.68,-1.22,-.57);
      pivot.rotation.z=Math.PI/2;
    });
    // Photo-backed 3D surfaces. Split at the real motorized pan joint:
    // upper optics stay stable while lower PTZ gently swivels independently.
    const w=image.naturalWidth,h=image.naturalHeight;
    const split=Math.round(h*.554),overlap=Math.min(13,Math.round(h*.01));
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
      // Dense image-mapped curved geometry creates genuine visible parallax:
      // lens bowls, side shells and lower PTZ lens have separate Z depth.
      const geometry=new THREE.PlaneGeometry(imageWidth,hh,68,Math.max(24,Math.round(68*hh/imageWidth)));
      const pos=geometry.attributes.position;
      const bump=(u,v,cx,cy,rx,ry,depth)=>{
        const dx=(u-cx)/rx,dy=(v-cy)/ry;
        return depth*Math.exp(-3.5*(dx*dx+dy*dy));
      };
      for(let i=0;i<pos.count;i++){
        const px=pos.getX(i),py=pos.getY(i);
        const u=px/imageWidth+.5;
        const v=(start+(end-start)*(.5-py/hh))/h;
        let depth=0;
        if(v>.285&&v<.554){
          const norm=(u-.5)/.41;
          depth+=.16*Math.sqrt(Math.max(0,1-norm*norm));
          depth+=bump(u,v,.27,.413,.16,.14,.17);
          depth+=bump(u,v,.5,.422,.15,.15,.23);
          depth+=bump(u,v,.73,.413,.16,.14,.17);
        }
        if(v>.54&&v<.95){
          depth+=bump(u,v,.5,.745,.26,.28,.16);
          depth+=bump(u,v,.5,.765,.1,.09,.21);
          depth+=bump(u,v,.5,.58,.25,.075,.12);
        }
        pos.setZ(i,depth);
      }
      geometry.computeVertexNormals();
      const face=new THREE.Mesh(
        geometry,
        new THREE.MeshPhongMaterial({
          map:texture,transparent:true,alphaTest:.065,side:THREE.DoubleSide,
          shininess:52,specular:0x5275a2,depthWrite:false
        })
      );
      face.position.set(0,centerY,.29);
      parent.add(face);
      return face;
    }
    const upperHeight=imageHeight*(split+overlap)/h;
    const lowerStart=split-overlap;
    const lowerHeight=imageHeight*(h-lowerStart)/h;
    photoPart(0,split+overlap,upper,(imageHeight-upperHeight)/2);
    lower.position.y=0;
    photoPart(lowerStart,h,lower,(imageHeight-lowerHeight)/2-imageHeight*lowerStart/h);
    // Back housing now aligns directly with the lower photo surface; no overlapping black bulges.
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
      lower.rotation.y=pointer+(prefersReduced?0:Math.sin(tm*.63)*.17);
      upper.rotation.x=pointerY;
      lower.rotation.x=pointerY*.6;
      rig.position.y=prefersReduced?-.05:Math.sin(tm*.93)*.028-.05;
      renderer.render(scene,camera);
      schedule();
    }
    function down(ev){if(ev.pointerType==='mouse'&&ev.button!==0)return;drag=true;lastX=ev.clientX;stage.setPointerCapture?.(ev.pointerId);}
    function move(ev){
      if(drag){target=Math.max(-.37,Math.min(.37,target+(ev.clientX-lastX)*.006));lastX=ev.clientX;}
      else if(ev.pointerType==='mouse'){
        const b=stage.getBoundingClientRect();
        target=Math.max(-.31,Math.min(.31,(ev.clientX-b.left-b.width/2)/b.width*.58));
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
