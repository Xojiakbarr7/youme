'use strict';
/* YOU ME camera product-faithful 3D visualization.
   Curved depth surface and sidewalls generated from the exact transparent
   original product photograph; two solid antennas, independent PTZ pivot.
   Unlike prior versions there is NO photograph-sized black background mesh.
   Front appearance is exact; unpictured rear/side depth is approximate. */
(()=>{
 const stage=document.getElementById('camera3dStage');
 if(!stage)return;
 const fallback=stage.querySelector('.hero-camera-fallback');
 const imageUrl='/assets/youme_promo_camera.webp';
 if(fallback)fallback.src=imageUrl;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let attempted=false;
 async function start(){
  if(attempted)return;attempted=true;
  let THREE;
  try{
    THREE=await import('/vendor/three.module.js');
  }catch(e){
    console.warn('Local 3D engine unavailable; showing product photo',e);
    return;
  }
  const img=fallback||new Image();
  if(!fallback)img.src=imageUrl;
  try{await img.decode();}catch(e){console.warn('Original product image not available');return;}
  const w=img.naturalWidth,h=img.naturalHeight;
  if(!w||!h)return;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}
  catch(e){console.info('WebGL unavailable; product photo remains');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.3;
  renderer.domElement.className='hero-camera-canvas';
  renderer.domElement.setAttribute('aria-hidden','true');
  stage.insertBefore(renderer.domElement,stage.firstChild);
  const scene=new THREE.Scene();
  const view=new THREE.PerspectiveCamera(36,1,.1,40);
  view.position.set(0,0,8.5);view.lookAt(0,.04,0);
  scene.add(new THREE.HemisphereLight(0xe4efff,0x102139,2.7));
  const white=new THREE.DirectionalLight(0xffffff,3.0);
  white.position.set(-3,4,5);scene.add(white);
  const cool=new THREE.DirectionalLight(0x4ba4ff,3.0);
  cool.position.set(4,3,-4);scene.add(cool);
  const sideKey=new THREE.DirectionalLight(0xe1edff,3.2);
  sideKey.position.set(5,1,2);scene.add(sideKey);
  const rearRim=new THREE.DirectionalLight(0x8ecfff,2.0);
  rearRim.position.set(-3,2,-6);scene.add(rearRim);
  const master=new THREE.Group(),upper=new THREE.Group(),ptz=new THREE.Group();
  scene.add(master);master.add(upper);master.add(ptz);
  const S=4.46/w, ox=w*.5,oy=h*.5;
  const px=x=>(x-ox)*S,py=y=>(oy-y)*S;
  const jointY=807,jointPos=py(jointY);
  ptz.position.y=jointPos;
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Could not read source photo alpha');
  ctx.drawImage(img,0,0,w,h);
  const rgba=ctx.getImageData(0,0,w,h).data;
  const at=(x,y)=>{
   x=Math.min(w-1,Math.max(0,Math.round(x)));
   y=Math.min(h-1,Math.max(0,Math.round(y)));
   return rgba[(y*w+x)*4+3];
  };
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  const photoMaterial=new THREE.MeshBasicMaterial({
   map:texture,transparent:true,alphaTest:.035,depthWrite:true,side:THREE.FrontSide,toneMapped:false
  });
  const cast=new THREE.MeshStandardMaterial({color:0x647181,metalness:.83,roughness:.26,side:THREE.DoubleSide});
  const graphite=new THREE.MeshStandardMaterial({color:0x283441,metalness:.62,roughness:.31,side:THREE.DoubleSide});
  const antennaMat=new THREE.MeshStandardMaterial({color:0x151c25,metalness:.57,roughness:.29});
  const lensMat=new THREE.MeshPhysicalMaterial({
    color:0x173d7a,roughness:.08,metalness:.49,clearcoat:1,transparent:true,opacity:.7
  });
  const trimMat=new THREE.MeshStandardMaterial({color:0x436b9d,metalness:.71,roughness:.16,transparent:true,opacity:.65});
  const bump=(x,y,cx,cy,rx,ry,a)=>{
   const dx=(x-cx)/rx,dy=(y-cy)/ry;
   return a*Math.exp(-2.5*(dx*dx+dy*dy));
  };
  // Exact silhouette + convex head bulges; actual product LEDs preserved in photo map.
  const topDepth=(x,y)=>.26+
   bump(x,y,323,515,180,160,.09)+bump(x,y,625,523,178,165,.13)+
   bump(x,y,927,515,180,160,.09)+
   bump(x,y,323,510,58,57,.035)+bump(x,y,625,520,63,66,.035)+
   bump(x,y,925,510,58,57,.035)+bump(x,y,625,739,215,107,.12);
  const bottomDepth=(x,y)=>.30+
    bump(x,y,624,994,252,270,.14)+bump(x,y,622,949,76,76,.025);
  // The leading/front surface is CURVED THREE DIMENSIONAL geometry, not a flat plane.
  // Its transparency keeps the real camera outline; dark background never enters mesh.
  function buildPart(group,start,end,relativeY,zFn,sideMat){
    const nx=108,ny=Math.ceil((end-start)/8);
    const v=[],uv=[],idx=[];
    for(let iy=0;iy<=ny;iy++){
      const y=start+(end-start)*iy/ny;
      for(let ix=0;ix<=nx;ix++){
        const x=w*ix/nx;
        v.push(px(x),py(y)-relativeY,zFn(x,y));
        uv.push(x/w,1-y/h);
      }
    }
    for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
      const a=iy*(nx+1)+ix,b=a+1,c=a+nx+1,d=c+1;
      idx.push(a,c,b,b,c,d);
    }
    const face=new THREE.BufferGeometry();
    face.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    face.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    face.setIndex(idx);face.computeVertexNormals();
    group.add(new THREE.Mesh(face,photoMaterial));
    // Volumetric side geometry: a curved cross-section, not a straight
    // photo-thin wall. At the rear the housing tapers into rounded domes.
    const wall=[];
    const quad=(a,b,c,d)=>wall.push(...a,...b,...c,...b,...d,...c);
    let prev=null;
    const step=6,layers=10;
    const rearZ=group===upper?-1.18:-1.07;
    function sidePoint(x,y,t,left){
      const front=px(x),outward=left?-1:1;
      const recess=(left?1:-1)*.17*t;
      const convex=outward*.085*Math.sin(Math.PI*t);
      return [
        front+recess+convex,
        py(y)-relativeY,
        zFn(x,y)+(rearZ-zFn(x,y))*t
      ];
    }
    for(let y=start;y<=end;y+=step){
      let left=w,right=-1;
      for(let x=0;x<w;x+=3){
        if(at(x,y)>65){left=Math.min(left,x);right=Math.max(right,x);}
      }
      if(right-left<24){prev=null;continue;}
      const now={
        l:Array.from({length:layers+1},(_,i)=>sidePoint(left,y,i/layers,true)),
        r:Array.from({length:layers+1},(_,i)=>sidePoint(right,y,i/layers,false))
      };
      if(prev)for(let k=0;k<layers;k++){
        quad(prev.l[k],now.l[k],prev.l[k+1],now.l[k+1]);
        quad(prev.r[k],prev.r[k+1],now.r[k],now.r[k+1]);
      }
      prev=now;
    }
    if(wall.length){
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(wall,3));
      geo.computeVertexNormals();
      group.add(new THREE.Mesh(geo,sideMat));
    }
  }
  // Upper unit includes the 3 lenses and the broad silver PTZ motor collar.
  buildPart(upper,350,jointY+10,0,topDepth,cast);
  // The lower black optical camera rotates around its real collar joint.
  buildPart(ptz,jointY-10,h-7,jointPos,bottomDepth,graphite);
  // Both antennas are true round 3D cylinders; no billboard rods.
  function cylinder(r,length,mat,parent,x,y,z){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,28),mat);
    m.position.set(x,y,z);parent.add(m);return m;
  }
  for(const xpos of [485,763]){
    const x=px(xpos),lo=py(355),hi=py(22);
    cylinder(.082,.13,cast,upper,x,lo,-.02);
    cylinder(.071,hi-lo-.045,antennaMat,upper,x,(hi+lo)/2,-.02);
    cylinder(.084,.10,graphite,upper,x,hi-.045,-.02);
    for(let i=0;i<3;i++)cylinder(.077,.025,antennaMat,upper,x,lo+.28+i*.12,-.02);
  }
  // Side profile based on the actual customer's photo (4G PTZ model).
  // Upper lens pods are hemispherical and deep, not rectangular or flat.
  const polished=new THREE.MeshPhysicalMaterial({
    color:0x373d48,metalness:.69,roughness:.24,clearcoat:.78,clearcoatRoughness:.15
  });
  const molded=new THREE.MeshPhysicalMaterial({
    color:0x11161e,metalness:.36,roughness:.29,clearcoat:.63,clearcoatRoughness:.18
  });
  const edgeMetal=new THREE.MeshStandardMaterial({color:0x69727f,metalness:.86,roughness:.24});
  const seam=new THREE.MeshStandardMaterial({color:0x06080c,metalness:.16,roughness:.44});
  function ellipsoid(parent,x,y,z,rx,ry,rz,mat){
    const shape=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),mat);
    shape.position.set(x,y,z);shape.scale.set(rx,ry,rz);
    parent.add(shape);return shape;
  }
  function ring(parent,x,y,z,r,t,mat){
    const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,12,64),mat);
    o.position.set(x,y,z);parent.add(o);return o;
  }
  function roundSide(parent,x,y,z,r,depth,mat,normal){
    const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,64),mat);
    o.position.set(x,y,z);o.rotation.z=Math.PI/2;
    parent.add(o);return o;
  }
  const headY=py(522);
  // The silver upper tubular chassis flows into black spherical end-pods.
  ellipsoid(upper,0,headY,-.65,1.43,.54,.75,edgeMetal);
  for(const sx of [-1,1]){
    const x=sx*1.12;
    ellipsoid(upper,x,headY,-.69,.61,.54,.77,polished);
    ellipsoid(upper,x,headY,-.45,.51,.47,.49,molded);
    // Thin metallic seam behind, never an extra protruding front lens.
    ring(upper,x,headY,-.10,.465,.027,edgeMetal);
    // Small inset seam at upper rear junction.
    const sideSeam=ellipsoid(upper,x,headY,-1.26,.47,.43,.12,seam);
  }
  // Smooth centre body and real cylindrical silver motor collar.
  ellipsoid(upper,0,headY,-.56,.73,.50,.70,edgeMetal);
  const swivelY=py(745);
  const collar=new THREE.Mesh(
    new THREE.CylinderGeometry(.80,.82,.41,64),
    new THREE.MeshStandardMaterial({color:0x808a96,metalness:.88,roughness:.25})
  );
  collar.position.set(0,swivelY,-.65);
  upper.add(collar);
  for(const offset of [-.197,.202]){
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.83,.83,.035,64),edgeMetal);
    rim.position.set(0,swivelY+offset,-.65);upper.add(rim);
  }
  // Body of the black lower PTZ head, rounded deeply toward its rear.
  const sideY=py(1015)-jointPos;
  ellipsoid(ptz,0,sideY,-.62,.69,.84,.75,molded);
  for(const sx of [-1,1]){
    ellipsoid(ptz,sx*.55,sideY,-.52,.31,.60,.56,polished);
    // Customer photo shows a large round disk on BOTH sides of lower PTZ.
    roundSide(ptz,sx*.73,sideY,-.40,.37,.18,molded,sx);
    roundSide(ptz,sx*.85,sideY,-.40,.305,.04,edgeMetal,sx);
    roundSide(ptz,sx*.88,sideY,-.40,.258,.052,molded,sx);
    roundSide(ptz,sx*.913,sideY,-.40,.13,.025,seam,sx);
  }
  // The real camera has a rear articulated wall bracket.
  // Keep the structure strictly behind the optical housing.
  const arm=new THREE.Mesh(new THREE.BoxGeometry(.24,.20,.69),edgeMetal);
  arm.position.set(0,headY,-1.42);upper.add(arm);
  const mount=new THREE.Mesh(new THREE.BoxGeometry(.62,.79,.12),polished);
  mount.position.set(0,headY,-1.78);upper.add(mount);
  const screwHole=new THREE.MeshStandardMaterial({color:0x070a10,roughness:.65});
  for(const dy of [-.25,.25]){
    const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.025,24),screwHole);
    bolt.position.set(0,headY+dy,-1.70);bolt.rotation.x=Math.PI/2;upper.add(bolt);
  }
  // Only geometry and plain materials are derived from the side reference:
  // its IMEI, QR label and account credentials are not uploaded or reproduced.
  // Independent lens glass, real thickness and specular highlights.
  function lens(group,xp,yp,offset,depth,r){
    const x=px(xp),y=py(yp)-offset,z=depth(xp,yp)+.032;
    const bezel=new THREE.Mesh(new THREE.TorusGeometry(r,.011,10,54),trimMat);
    bezel.position.set(x,y,z);group.add(bezel);
    const crystal=new THREE.Mesh(new THREE.SphereGeometry(r*.66,26,18),lensMat);
    crystal.scale.set(1,1,.20);
    crystal.position.set(x,y,z+.017);group.add(crystal);
  }
  // Natural lens glass is already present in the original photo map.
  // Do not overlay 3D spheres or rings: those looked like protruding fake eyes.
  let ww=0,hh=0,visible=true,queued=false,last=0,drag=false,lastX=0,yaw=.22,targetYaw=.22,pitch=0,targetPitch=0;
  function resize(){
    const b=stage.getBoundingClientRect();
    const width=Math.max(2,Math.round(b.width)),height=Math.max(2,Math.round(b.height));
    if(width===ww&&height===hh)return;
    ww=width;hh=height;
    renderer.setSize(width,height,false);
    view.aspect=width/height;view.updateProjectionMatrix();
    master.scale.setScalar(width<400?.80:width<650?.91:1);
    view.position.z=width<400?9.4:width<650?9.0:8.5;
    view.lookAt(0,.04,0);
  }
  function requestFrame(){if(visible&&!document.hidden&&!queued){queued=true;requestAnimationFrame(frame);}}
  function frame(ms){
    queued=false;if(!visible||document.hidden)return;
    if(!reduced&&ms-last<30){requestFrame();return;}last=ms;
    resize();
    const t=ms/1000;
    // Rotate enough to demonstrate the rounded side housings, without
    // turning the actual front optical photograph into a narrow billboard.
    const wave=reduced?0:Math.sin(t*.34)*.24;
    yaw+=(targetYaw+wave-yaw)*.065;
    pitch+=(targetPitch-pitch)*.05;
    master.rotation.y=yaw;master.rotation.x=pitch;
    ptz.rotation.y=reduced?0:Math.sin(t*.63)*.17;
    master.position.y=reduced?-.04:Math.sin(t*.9)*.027-.04;
    renderer.render(scene,view);
    if(!reduced)requestFrame();
  }
  stage.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    drag=true;lastX=e.clientX;stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener('pointermove',e=>{
    if(drag){targetYaw=Math.max(-1.03,Math.min(1.03,targetYaw+(e.clientX-lastX)*.006));lastX=e.clientX;}
    else if(e.pointerType==='mouse'){
      const b=stage.getBoundingClientRect();
      targetYaw=Math.max(-.58,Math.min(.58,(e.clientX-b.left-b.width/2)/b.width*1.12));
      targetPitch=Math.max(-.055,Math.min(.055,-(e.clientY-b.top-b.height/2)/b.height*.10));
    }
    if(reduced)requestFrame();
  });
  stage.addEventListener('pointerup',()=>drag=false);
  stage.addEventListener('pointercancel',()=>drag=false);
  stage.addEventListener('pointerleave',()=>{if(!drag){targetYaw=.22;targetPitch=0;}});
  if('ResizeObserver'in window)new ResizeObserver(()=>{resize();requestFrame();}).observe(stage);
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{
    visible=Boolean(entries[0]?.isIntersecting);if(visible)requestFrame();
  },{threshold:.03}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestFrame();});
  resize();renderer.render(scene,view);
  stage.classList.add('is-3d-ready');
  requestFrame();
 }
 if('IntersectionObserver'in window){
   const obs=new IntersectionObserver(e=>{
     if(e[0]?.isIntersecting){obs.disconnect();start().catch(err=>console.warn('3D product fallback:',err));}
   },{rootMargin:'150px'});
   obs.observe(stage);
 }else start().catch(err=>console.warn('3D product fallback:',err));
})();
