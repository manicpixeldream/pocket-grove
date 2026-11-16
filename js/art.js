'use strict';

// Orthographic camera and a shared directional light in world coordinates.
const art=document.querySelector('#world').getContext('2d');
const introArt=document.querySelector('#egg-world').getContext('2d');
const light=normalize([-0.67,1,0.48]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function normalize(v){const n=Math.hypot(...v);return v.map(a=>a/n);}
const palette=new Map();
function shades(color) {
  if(!palette.has(color)){
    const n=parseInt(color.slice(1),16);
    palette.set(color,Array.from({length:33},(_,i)=>{
      const factor=i/24;
      return 'rgb('+[n>>16,(n>>8)&255,n&255].map(c=>Math.min(255,Math.round(c*factor))).join(',')+')';
    }));
  }
  return palette.get(color);
}

class Scene {
  constructor(ctx,x,y,yaw,pitch,ambient){
    this.ctx=ctx;this.x=x;this.y=y;this.ambient=ambient;
    const a=Math.cos(yaw),b=Math.sin(yaw),c=Math.cos(pitch),d=Math.sin(pitch);
    this.right=[a,0,-b];this.up=[-b*d,c,-a*d];this.view=[b*c,d,a*c];
    this.faces=[];this.shadows=[];
  }
  project(v){return [this.x+dot(v,this.right),this.y-dot(v,this.up)];}
  face(vertices,color,shadow=true){
    const normal=normalize(cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0])));
    if(shadow){
      const points=vertices.map(([x,y,z])=>this.project([x-y*light[0]/light[1],0,z-y*light[2]/light[1]]));
      const area=points.reduce((n,[x,y],i)=>n+x*points[(i+1)%points.length][1]-y*points[(i+1)%points.length][0],0);
      if(Math.abs(area)>.01)this.shadows.push(area<0?points.reverse():points);
    }
    if(dot(normal,this.view)<=0)return;
    const intensity=this.ambient+.65*Math.max(0,dot(normal,light));
    const tone=shades(color)[Math.min(32,Math.round(intensity*24))];
    const points=vertices.map(v=>this.project(v));
    const depth=vertices.reduce((n,v)=>n+dot(v,this.view),0)/vertices.length;
    this.faces.push({points,tone,depth});
  }
  ground(vertices,color){
    this.ctx.beginPath();this.path(vertices.map(v=>this.project(v)));
    this.ctx.fillStyle=color;this.ctx.fill();
  }
  path(points){
    this.ctx.moveTo(...points[0]);
    for(const point of points.slice(1))this.ctx.lineTo(...point);
    this.ctx.closePath();
  }
  box(x,y,z,w,h,d,color,shadow=true){
    const a=[x,y,z],b=[x+w,y,z],c=[x+w,y,z+d],e=[x,y,z+d];
    const top=v=>[v[0],y+h,v[2]];
    const A=top(a),B=top(b),C=top(c),E=top(e);
    for(const side of [[A,E,C,B],[a,A,B,b],[b,B,C,c],[c,C,E,e],[e,E,A,a]]){
      this.face(side,color,shadow);
    }
  }
  draw(shadowColor){
    const g=this.ctx;
    g.beginPath();
    for(const path of this.shadows)this.path(path);
    g.fillStyle=shadowColor;g.fill();
    this.faces.sort((a,b)=>a.depth-b.depth);
    g.lineWidth=.45;
    for(const {points,tone} of this.faces){
      g.beginPath();this.path(points);g.fillStyle=tone;g.strokeStyle=tone;g.fill();g.stroke();
    }
  }
}

const eggRings=[[.02,.31],[.07,.57],[.16,.82],[.29,.97],[.43,1],[.57,.93],[.7,.82],[.83,.65],[.93,.43],[.98,.23],[1,.02]];
function shell(scene,data,x,y,z,scale,cracked=false,tilt=0){
  const [dark,base,lightColor,cream]=data.colors;
  const sides=24;
  const vertex=(ring,side)=>{
    const [height,radius]=eggRings[ring];
    const a=side/sides*Math.PI*2;
    const px=Math.cos(a)*radius*scale*13;
    const py=height*scale*35;
    return [x+px*Math.cos(tilt)-py*Math.sin(tilt),y+px*Math.sin(tilt)+py*Math.cos(tilt),z+Math.sin(a)*radius*scale*13];
  };
  for(let row=0;row<eggRings.length-1;row++){
    for(let side=0;side<sides;side++){
      const spot=((row*17+side*13)%31)<5;
      const band=(row===3&&(side+4)%9<4)||(row===6&&(side+2)%11<3);
      const crack=cracked&&[[9,5],[8,5],[7,6],[6,6],[5,5],[4,5]].some(([r,j])=>r===row&&j===side);
      scene.face([vertex(row,side),vertex(row+1,side),vertex(row+1,side+1),vertex(row,side+1)],crack?dark:band?cream:spot?lightColor:base);
    }
  }
}

function vignette(g,x,y,xRadius,yRadius,center,edge){
  g.save();
  g.translate(x,y);g.scale(1,yRadius/xRadius);
  const glow=g.createRadialGradient(0,0,0,0,0,xRadius);
  glow.addColorStop(0,center);glow.addColorStop(1,edge);
  g.fillStyle=glow;g.fillRect(-xRadius,-xRadius,2*xRadius,2*xRadius);
  g.restore();
}

function paintIntro(now,motion){
  const g=introArt;
  const hovered=document.querySelector('.egg-select.chosen, .egg-select:hover, .egg-select:focus-visible')?.dataset.id;
  const choosing=document.querySelector('#egg-intro').classList.contains('choosing');
  g.fillStyle='#090810';g.fillRect(0,0,400,184);
  const scene=new Scene(g,200,122,0,.28,.42);
  EGGS.forEach((data,i)=>{
    const x=(i-1)*108;
    const active=hovered===data.id;
    vignette(g,200+x,115,60,30,active?'#514169':'#2a233a','#09081000');
    const jump=motion&&active?(choosing?Math.abs(Math.sin(now/47))*12:Math.round((Math.sin(now/360)+1)*1.7)):0;
    shell(scene,data,x,jump,0,1.55,false,motion&&active?Math.sin(now/200)*.08:0);
  });
  scene.draw('#09070e9c');
}

function tree(scene,x,z,size){
  const cube=(a,b,c,w,h,d,color)=>scene.box(x+a*size,b*size,z+c*size,w*size,h*size,d*size,color);
  cube(-3,0,-3,6,32,6,'#a37a55');
  cube(-13,20,-10,26,14,21,'#508963');
  cube(-16,27,-13,32,13,26,'#609b67');
  cube(-11,38,-9,22,8,19,'#76ad70');
  cube(-6,45,-5,12,4,11,'#91bf77');
  cube(-17,33,1,7,5,7,'#78a568');
  cube(10,36,7,4,4,4,'#ecc079');
}
function flower(scene,x,z,petal){
  scene.box(x,0,z,1,4,1,'#5e925d',false);
  scene.box(x-1,4,z-1,3,1,3,petal,false);
  scene.box(x,5,z,1,1,1,'#ffe8a2',false);
}
function creature(scene,data,x,y,z,stage,form,blink,excited,wear){
  const [dark,base,soft,cream]=data.colors;
  const scale=[0,.85,1.08,1.25][stage];
  const coat=stage===3?(form===1?'#edab69':'#a8a5eb'):base;
  const box=(a,b,c,w,h,d,col)=>scene.box(x+a*scale,y+b*scale,z+c*scale,w*scale,h*scale,d*scale,col);
  box(-10,2,-7,20,15,15,coat);
  box(-12,15,-7,24,16,18,coat);
  box(-9,31,-5,18,2,13,coat);
  box(-9,0,4,6,5,8,soft);box(3,0,4,6,5,8,soft);
  box(-7,16,10,14,7,4,cream);
  if(data.id==='dusk'){
    box(-10,30,-4,6,16,6,coat);box(3,30,-4,6,19,6,coat);
    box(-9,34,2,3,10,1,'#e6a4c6');box(4,34,2,3,12,1,'#e6a4c6');
    box(-4,4,-12,8,8,6,cream);
  }else{
    box(-12,28,-5,7,11,7,coat);box(5,28,-5,7,11,7,coat);
    box(-11,31,2,4,5,1,cream);box(6,31,2,4,5,1,cream);
    box(8,5,-16,8,8,13,coat);box(10,8,-20,6,7,5,cream);
  }
  box(-7,24,11,3,blink?1:4,1,'#32243c');box(4,24,11,3,blink?1:4,1,'#32243c');
  box(-2,21,14,4,2,1,dark);
  box(-10,20,11,4,2,1,'#eea6b6');box(6,20,11,4,2,1,'#eea6b6');
  if(excited)box(-1,18,14,2,3,1,dark);
  if(data.id==='ember'||stage===3){
    const wing=stage===3?(form===1?'#ffe195':'#d9c9ff'):soft;
    box(-17,13,-8,8,8,4,wing);box(-18,19,-9,5,7,3,wing);
    box(9,13,-8,8,8,4,wing);box(13,19,-9,5,7,3,wing);
  }
  if(wear==='bow'){
    box(4,30,8,4,5,5,'#d4518d');box(8,31,9,3,3,4,'#f886b0');box(11,30,8,4,5,5,'#d4518d');
  }
  if(wear==='crown'||stage===3){
    box(-5,33,0,10,3,8,'#eeb64e');
    for(const x of [-5,-1,3])box(x,36,0,2,3,3,'#ffdb77');
  }
  if(wear==='scarf'){box(-10,13,8,20,4,4,'#83c6e3');box(4,8,10,4,6,3,'#83c6e3');}
}

function paintWorld(now,state,reactionUntil){
  const g=art;
  const night=state.equipped.sky==='twilight';
  const sky=g.createLinearGradient(0,0,0,104);
  sky.addColorStop(0,night?'#55547d':'#a4d8de');
  sky.addColorStop(1,night?'#ac99bb':'#e6f2d4');
  g.fillStyle=sky;g.fillRect(0,0,320,190);
  g.fillStyle=night?'#f0dfc8':'#ffeead';
  g.beginPath();g.arc(256,36,14,0,Math.PI*2);g.fill();
  const scene=new Scene(g,160,146,.21,.36,night?.36:.54);
  scene.ground([[-800,0,-188],[800,0,-188],[800,0,650],[-800,0,650]],night?'#639275':'#9bc488');
  for(let i=0;i<13;i++){
    const x=-270+(i*43)%545,z=-165+(i*19)%42;
    tree(scene,x,z,.63+i%3*.17);
  }
  const patch=(x,z,w,d,c)=>scene.ground([[x,0,z],[x+w,0,z],[x+w,0,z+d],[x,0,z+d]],c);
  patch(-43,-18,86,49,night?'#839b76':'#c8d29a');
  patch(-120,-9,34,23,'#74adac');patch(-116,-6,26,17,'#8bc5c1');
  patch(-109,2,9,3,'#b0d8c1');
  for(let i=0;i<63;i++){
    const x=-163+(i*43)%326,z=-111+(i*31)%215;
    if(Math.abs(x)<43&&z>-22&&z<40)continue;
    patch(x,z,2+i%5,2,i%2?(night?'#6da27a':'#84b477'):(night?'#87a181':'#b1ce8f'));
    if(i%4===0)flower(scene,x,z,['#efd389','#f6e5af','#db8eb9'][i%3]);
  }
  tree(scene,-130,-36,1.12);tree(scene,123,-45,1.35);
  for(let x=64;x<132;x+=14){
    scene.box(x,0,-16,3,13,3,'#e0b683');
    if(x<120)scene.box(x+3,3,-15,11,6,2,'#be8f62');
  }
  if(state.equipped.rug){patch(-29,-16,58,41,'#b16d9e');patch(-26,-13,52,35,'#dba0bd');}
  if(state.equipped.furniture){
    scene.box(46,0,-18,3,9,13,'#a27a53');scene.box(72,0,-18,3,9,13,'#a27a53');
    scene.box(44,9,-18,34,3,13,'#d3a173');scene.box(45,12,-19,32,8,3,'#d3a173');
  }
  if(state.equipped.plant){
    scene.box(-48,0,13,10,8,9,'#bf8665');
    scene.box(-45,8,16,4,11,3,'#64995f');scene.box(-48,13,15,10,4,6,'#80b46f');
  }
  if(state.equipped.season){scene.box(48,0,28,13,9,11,'#eba55f');scene.box(52,9,32,3,3,3,'#72915c');}
  if(state.equipped.toy){scene.box(32,0,11,9,9,9,'#a981ce');scene.box(34,9,13,5,1,4,'#efd183');}
  if(state.milestones.length>=4){
    flower(scene,-38,22,'#e99abf');flower(scene,-34,24,'#ffdc8d');flower(scene,32,-15,'#e99abf');
  }
  const data=EGGS.find(entry=>entry.id===state.egg);
  const active=now<reactionUntil;
  const t=now/1000;
  const jump=state.settings.motion&&active?Math.abs(Math.sin(t*12))*9:0;
  if(data&&!state.pet.stage){
    const wiggle=state.settings.motion&&state.milestones.length?Math.sin(t*13)*Math.max(0,Math.sin(t*1.1)-.63)*.45:0;
    shell(scene,data,0,jump,0,1.18,state.milestones.length>=2,wiggle);
  }else if(data){
    const drift=state.settings.motion?Math.sin(t*.8)*5:0;
    const blink=state.settings.motion&&t%4<.16;
    creature(scene,data,drift,jump,0,state.pet.stage,state.pet.form,blink,active,state.equipped.wear);
  }
  scene.draw(night?'#30364c7b':'#374e4870');
}
