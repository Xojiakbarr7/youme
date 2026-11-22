'use strict';
/* YOU ME hero: real interactive 3D model, not a rendered picture.
   Inspired by the three-head, dual-antenna black PTZ product.
   Camera render loads only when visible; static product image is the fallback. */
(function(){
  const stage=document.getElementById('camera3dStage');
  if(!stage)return;
  let disposed=false;
  async function boot(){
    if(disposed || stage.classList.contains('is-3d-ready'))return;
    let T;
    try{
      T=await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');
    }catch(firstError){
      try{T=await import('https://unpkg.com/three@0.161.0/build/three.module.js');}
      catch(secondError){console.info('3D module unavailable, keeping product photo.');return;}
    }
    if(disposed||!stage.isConnected)return;
    let renderer;
    try{
      renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    }catch(e){console.info('WebGL not available, showing product photo.');return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.75;
    renderer.domElement.className='hero-camera-canvas';
    renderer.domElement.setAttribute('aria-hidden','true');
    stage.prepend(renderer.domElement);
    const scene=new T.Scene();
    const view=new T.PerspectiveCamera(36,1,.1,60);
    view.position.set(0,.28,9.0);
    view.lookAt(0,.13,0);
    scene.add(new T.HemisphereLight(0xcfe8ff,0x081021,3.4));
    const key=new T.DirectionalLight(0xd5e5ff,5.2);key.position.set(-3,5,6);scene.add(key);
    const rim=new T.DirectionalLight(0x008eff,7);rim.position.set(4,1,-3);scene.add(rim);
    const warm=new T.PointLight(0x69c8ff,15,12);warm.position.set(0,0,4);scene.add(warm);
    const mat=(color,metalness=.45,roughness=.32)=>new T.MeshStandardMaterial({color,metalness,roughness});
    const graphite=mat(0x171b22,.64,.28),dark=mat(0x080b12,.58,.24),
      silver=mat(0x626e7e,.83,.22),edge=mat(0x323b49,.82,.24),
      face=mat(0x12151d,.48,.32),glass=new T.MeshPhysicalMaterial({color:0x061728,metalness:.48,roughness:.06,clearcoat:1,clearcoatRoughness:.07}),
      lensBlue=new T.MeshPhysicalMaterial({color:0x073d85,metalness:.72,roughness:.08,clearcoat:1}),
      led=new T.MeshStandardMaterial({color:0xfff7d6,emissive:0xffd380,emissiveIntensity:2.6,roughness:.26}),
      blueLed=new T.MeshStandardMaterial({color:0x66deff,emissive:0x0a8dff,emissiveIntensity:3.3,roughness:.2});
    const root=new T.Group();scene.add(root);
    const body=new T.Group();root.add(body);
    const sphere=(r,m,parent,x,y,z,seg=18)=>{
      const mesh=new T.Mesh(new T.SphereGeometry(r,seg,12),m);
      mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    };
    function rounded(w,h,d,r,m,parent,x=0,y=0,z=0){
      const shape=new T.Shape(),x0=-w/2,x1=w/2,y0=-h/2,y1=h/2;
      r=Math.min(r,w/2,h/2);
      shape.moveTo(x0+r,y0);
      shape.lineTo(x1-r,y0);shape.quadraticCurveTo(x1,y0,x1,y0+r);
      shape.lineTo(x1,y1-r);shape.quadraticCurveTo(x1,y1,x1-r,y1);
      shape.lineTo(x0+r,y1);shape.quadraticCurveTo(x0,y1,x0,y1-r);
      shape.lineTo(x0,y0+r);shape.quadraticCurveTo(x0,y0,x0+r,y0);
      const bevel=.035;
      const geom=new T.ExtrudeGeometry(shape,{steps:1,depth:Math.max(.02,d-2*bevel),bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:4});
      geom.translate(0,0,-(d-2*bevel)/2);
      const mesh=new T.Mesh(geom,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    }
    function cylinder(radius,height,m,parent,x,y,z,segments=28,radius2=radius){
      const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius2,height,segments),m);
      mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    }
    function frontCylinder(radius,thick,m,parent,x,y,z,segments=48){
      const mesh=cylinder(radius,thick,m,parent,x,y,z,segments);
      mesh.rotation.x=Math.PI/2;return mesh;
    }
    function torus(radius,tube,m,parent,x,y,z){
      const mesh=new T.Mesh(new T.TorusGeometry(radius,tube,10,48),m);
      mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    }
    // Rear structure: black camera chassis, mounting brace, articulated swivel.
    rounded(4.25,.43,.65,.17,graphite,body,0,.70,-.23);
    rounded(3.93,.18,.74,.075,silver,body,0,.86,-.22);
    cylinder(.66,.37,silver,body,0,.29,-.16);
    cylinder(.57,.54,graphite,body,0,.03,-.16);
    cylinder(.65,.12,edge,body,0,-.19,-.16);
    // Three upper independent horizontal optical clusters.
    const configs=[
      {x:-1.43,scale:.89,front:.76},
      {x:0,scale:1,front:.86},
      {x:1.43,scale:.89,front:.76}
    ];
    function optical(parent,xc,yc,zc,r,leds){
      frontCylinder(r*1.15,.14,silver,parent,xc,yc,zc);
      frontCylinder(r*1.00,.15,dark,parent,xc,yc,zc+.13);
      torus(r*.86,.035,edge,parent,xc,yc,zc+.23);
      frontCylinder(r*.72,.075,glass,parent,xc,yc,zc+.26);
      frontCylinder(r*.42,.075,lensBlue,parent,xc,yc,zc+.315);
      frontCylinder(r*.23,.046,glass,parent,xc,yc,zc+.356);
      sphere(r*.11,blueLed,parent,xc-r*.08,yc+r*.10,zc+.39,14);
      torus(r*.35,.025,blueLed,parent,xc,yc,zc+.366);
      for(let k=0;k<leds;k++){
        const ang=k/leds*Math.PI*2+Math.PI/8;
        sphere(r*.145,led,parent,xc+Math.cos(ang)*r*1.62,yc+Math.sin(ang)*r*1.55,zc+.24,12);
      }
    }
    configs.forEach((m,i)=>{
      const g=new T.Group();g.position.x=m.x;body.add(g);
      rounded(1.31,1.2,.85,.20,graphite,g,0,1.37,.05);
      rounded(1.19,1.09,.08,.17,silver,g,0,1.37,.49);
      rounded(1.12,1.03,.10,.14,face,g,0,1.37,.56);
      optical(g,0,1.37,.60,i===1?.245:.23,8);
      // Finely-machined faceplate bolts.
      for(const bx of [-.48,.48])for(const by of [1.0,1.74])
        sphere(.033,silver,g,bx,by,.635,10);
      cylinder(.13,.23,edge,body,m.x,.64,-.27);
    });
    // Dual, non-solar vertical antennas from the reference product.
    [-1.72,1.72].forEach(x=>{
      cylinder(.13,.22,silver,body,x,2.00,-.38);
      cylinder(.092,1.51,dark,body,x,2.85,-.38,16,.084);
      cylinder(.10,.09,edge,body,x,3.60,-.38);
      for(let j=0;j<4;j++)cylinder(.098,.027,edge,body,x,2.40+j*.23,-.38);
    });
    // Central motorized 360-degree pan ring.
    cylinder(.90,.36,graphite,body,0,-.42,-.07);
    cylinder(.84,.09,silver,body,0,-.64,-.07);
    cylinder(.74,.38,dark,body,0,-.85,-.07);
    const ptz=new T.Group();ptz.position.set(0,-.92,.06);body.add(ptz);
    rounded(1.72,1.73,1.10,.38,graphite,ptz,0,-.45,.08);
    rounded(1.40,1.40,.10,.32,silver,ptz,0,-.45,.64);
    rounded(1.31,1.32,.12,.28,face,ptz,0,-.45,.72);
    // The lower rotating camera lens and LED floodlight cluster.
    rounded(1.00,.70,.12,.15,dark,ptz,0,-.32,.83);
    optical(ptz,0,-.32,.88,.235,0);
    rounded(1.12,.39,.09,.085,dark,ptz,0,-.97,.84);
    for(let ix=-3;ix<=3;ix++){
      for(let iy=0;iy<2;iy++){
        sphere(.055,led,ptz,ix*.145,-.89-iy*.14,.93,11);
      }
    }
    // Pan/tilt engine and side bearings.
    for(const x of [-.92,.92]){
      cylinder(.27,.26,edge,ptz,x,-.54,.0,30).rotation.z=Math.PI/2;
      sphere(.12,silver,ptz,x*1.13,-.54,.0);
    }
    // Decorative bottom ventilation and subtle blue status LED.
    rounded(.60,.10,.12,.045,dark,ptz,0,-1.26,.68);
    for(let k=0;k<7;k++)rounded(.05,.068,.035,.01,edge,ptz,(k-3)*.078,-1.26,.755);
    sphere(.056,blueLed,ptz,0,-1.26,.83);
    const prefersReduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vw=0,vh=0,visible=true,animating=false,lastFrame=0,dragging=false,startX=0,targetYaw=0.10,yaw=0.10,pitch=0;
    function resize(){
      const box=stage.getBoundingClientRect();
      const width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));
      if(width===vw&&height===vh)return;
      vw=width;vh=height;
      renderer.setSize(vw,vh,false);
      view.aspect=vw/vh;view.updateProjectionMatrix();
      root.scale.setScalar(vw<420?.62:vw<650?.74:vw<880?.88:1.03);
      view.position.z=vw<420?10.4:vw<650?9.7:9.0;
      view.lookAt(0,.23,0);
    }
    function frame(ms){
      animating=false;
      if(disposed||!visible||document.hidden)return;
      if(!prefersReduced&&ms-lastFrame<28){schedule();return;}
      lastFrame=ms;
      resize();
      const tm=ms*.001;
      root.position.y=prefersReduced?-.10:Math.sin(tm*1.05)*.065-.11;
      const gentle=prefersReduced?0:Math.sin(tm*.35)*.055;
      const desired=targetYaw+gentle;
      yaw+=(desired-yaw)*.055;
      body.rotation.y=yaw;
      body.rotation.x+=(pitch-body.rotation.x)*.04;
      ptz.rotation.y=prefersReduced?0:Math.sin(tm*.60)*.20;
      ptz.rotation.x=prefersReduced?0:Math.sin(tm*.38)*.035;
      renderer.render(scene,view);
      schedule();
    }
    function schedule(){if(visible&&!document.hidden&&!animating){animating=true;requestAnimationFrame(frame);}}
    stage.addEventListener('pointerdown',ev=>{
      if(ev.pointerType==='mouse'&&ev.button!==0)return;
      dragging=true;startX=ev.clientX;stage.setPointerCapture?.(ev.pointerId);
    });
    stage.addEventListener('pointermove',ev=>{
      if(dragging){targetYaw=Math.max(-.82,Math.min(.82,targetYaw+(ev.clientX-startX)*.006));startX=ev.clientX;}
      else if(ev.pointerType==='mouse'){
        const b=stage.getBoundingClientRect();
        targetYaw=Math.max(-.5,Math.min(.5,(ev.clientX-b.left-b.width/2)/Math.max(1,b.width)*.9));
        pitch=Math.max(-.08,Math.min(.08,-(ev.clientY-b.top-b.height/2)/Math.max(1,b.height)*.13));
      }
    });
    const endDrag=()=>dragging=false;
    stage.addEventListener('pointerup',endDrag);
    stage.addEventListener('pointercancel',endDrag);
    stage.addEventListener('pointerleave',()=>{if(!dragging){targetYaw=.10;pitch=0;}});
    if('ResizeObserver' in window)new ResizeObserver(()=>{resize();schedule()}).observe(stage);
    if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
      visible=Boolean(entries[0]?.isIntersecting);if(visible)schedule();
    },{threshold:.04}).observe(stage);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
    resize();
    renderer.render(scene,view);
    stage.classList.add('is-3d-ready');
    schedule();
  }
  if('IntersectionObserver' in window){
    const loader=new IntersectionObserver(entries=>{
      if(entries[0]?.isIntersecting){loader.disconnect();boot().catch(e=>console.warn('3D hero fallback:',e.message));}
    },{rootMargin:'200px'});
    loader.observe(stage);
  }else{
    boot().catch(e=>console.warn('3D hero fallback:',e.message));
  }
})();
