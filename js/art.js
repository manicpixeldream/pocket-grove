'use strict';

// Orthographic camera and a shared directional light in world coordinates.
const art=document.querySelector('#world').getContext('2d');
const introArt=document.querySelector('#egg-world').getContext('2d');
art.scale(2,2);
introArt.scale(2,2);
art.imageSmoothingEnabled=false;
introArt.imageSmoothingEnabled=false;
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
    if(!color||dot(normal,this.view)<=0)return;
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
  rounded(x,y,z,w,h,d,color){
    const radius=Math.min(w,h,d)*.22;
    const frame=(height,inset)=>{
      const x0=x+inset,x1=x+w-inset,z0=z+inset,z1=z+d-inset;
      const bevel=radius-inset*.5;
      return [[x0+bevel,height,z0],[x0,height,z0+bevel],[x0,height,z1-bevel],[x0+bevel,height,z1],
        [x1-bevel,height,z1],[x1,height,z1-bevel],[x1,height,z0+bevel],[x1-bevel,height,z0]];
    };
    const rings=[frame(y,radius),frame(y+radius,0),frame(y+h-radius,0),frame(y+h,radius)];
    for(let row=0;row<rings.length-1;row++){
      for(let i=0;i<8;i++){
        const j=(i+1)%8;
        this.face([rings[row][i],rings[row][j],rings[row+1][j],rings[row+1][i]],color);
      }
    }
    this.face(rings.at(-1),color);
  }
  draw(shadowColor){
    const g=this.ctx;
    g.beginPath();
    for(const path of this.shadows)this.path(path);
    g.fillStyle=shadowColor;g.fill();
    this.faces.sort((a,b)=>a.depth-b.depth);
    g.lineWidth=.45;
    for(const face of this.faces){
      if(face.sprite){
        g.save();
        g.translate(...face.anchor);g.rotate(face.tilt);
        g.drawImage(face.sprite,-face.width/2,-face.height,face.width,face.height);
        g.restore();
        continue;
      }
      g.beginPath();this.path(face.points);g.fillStyle=face.tone;g.strokeStyle=face.tone;g.fill();g.stroke();
    }
  }
}

// Sample a tapered ellipsoid at native canvas pixel resolution. Its normal
// drives diffuse and specular lighting, and its surface coordinates carry the pattern.
const eggSprites=new Map();
const toRgb=ink=>[1,3,5].map(i=>parseInt(ink.slice(i,i+2),16));
function eggSprite(data,cracked,turn) {
  const key=[data.id,cracked,turn].join(':');
  if(eggSprites.has(key))return eggSprites.get(key);
  const sprite=document.createElement('canvas');
  const width=58,height=76;
  sprite.width=width;sprite.height=height;
  const g=sprite.getContext('2d');
  const image=g.createImageData(width,height);
  const colors=data.colors.map(toRgb);
  const rotation=turn*Math.PI/32;
  const viewLight=normalize([light[0],light[1]*.92-light[2]*.38,light[2]*.92+light[1]*.38]);
  const half=normalize([viewLight[0],viewLight[1],viewLight[2]+1]);
  for(let py=1;py<height-1;py++){
    const v=1-2*(py-.5)/(height-2);
    const taper=1-.19*v;
    const radius=Math.sqrt(Math.max(0,1-v*v));
    for(let px=1;px<width-1;px++){
      const u=(px-width/2)/27/taper;
      const z2=1-u*u-v*v;
      if(z2<=0)continue;
      const z=Math.sqrt(z2);
      const normal=normalize([u/taper,v*.76+.19*(1-v*v),z/taper]);
      const azimuth=Math.atan2(u,z)+rotation;
      const pattern=Math.sin(azimuth*7+v*9)*Math.cos(v*18-azimuth*2);
      const wave=-.37+.065*Math.sin(azimuth*5);
      const crack=cracked&&v>.07&&Math.abs(Math.sin(azimuth)-(.17+.09*Math.sin(v*43)))<.028;
      const color=colors[crack?0:Math.abs(v-wave)<.065?3:pattern>.64&&radius>.45?2:1];
      const diffuse=Math.max(0,dot(normal,viewLight));
      const gloss=Math.max(0,dot(normal,half))**48;
      const rim=(1-z)**3*.07;
      const factor=.36+diffuse*.72+rim;
      const grain=((px*29+py*17)%11-5)*.42;
      const offset=(py*width+px)*4;
      for(let channel=0;channel<3;channel++)image.data[offset+channel]=color[channel]*factor+gloss*55+grain;
      image.data[offset+3]=255;
    }
  }
  g.putImageData(image,0,0);
  eggSprites.set(key,sprite);
  return sprite;
}
function shell(scene,data,x,y,z,scale,cracked=false,tilt=0,turn=0,stretch=1){
  const height=35*scale*stretch;
  const width=27*scale/Math.sqrt(stretch);
  for(let i=0;i<20;i++){
    const a=i*Math.PI/10,b=(i+1)*Math.PI/10;
    scene.face([[x,y,z],[x+Math.cos(a)*width*.48,y+height*.39,z+Math.sin(a)*width*.48],
      [x+Math.cos(b)*width*.48,y+height*.39,z+Math.sin(b)*width*.48],[x,y+height,z]],null);
  }
  scene.faces.push({
    depth:dot([x,y+height*.5,z],scene.view),
    sprite:eggSprite(data,cracked,turn),
    anchor:scene.project([x,y,z]), width,height, tilt
  });
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
  const t=now/1000;
  EGGS.forEach((data,i)=>{
    const x=(i-1)*108;
    const active=hovered===data.id;
    const phase=t*[2.2,3.8,1.7][i]+i*1.9;
    const bounce=Math.max(0,Math.sin(phase))**2;
    const jump=motion?(choosing&&active?Math.abs(Math.sin(t*17))*17:bounce*(active?8:[4,6,3][i])):0;
    const lean=motion?Math.sin(phase*.82)*(active?.15:.08):0;
    const stretch=motion?1+Math.sin(phase)*.07+(choosing&&active?jump*.005:0):1;
    const turn=motion?(Math.floor((Math.sin(phase*.58)+1)*6)+i*12)%64:0;
    vignette(g,200+x,116,59,30,active?'#493b64':data.colors[0]+'54','#09081000');
    shell(scene,data,x,jump,0,1.68,false,lean,turn,stretch);
  });
  scene.draw('#09070e9e');
  if(motion)EGGS.forEach((data,i)=>{
    const x=92+i*108;
    for(let j=0;j<4;j++){
      const age=(t*.63+j*.25+i*.12)%1;
      if(age>.7)continue;
      const px=Math.round(x+Math.sin(j*12+i*3+age*2)*(20+age*34));
      const py=Math.round(113-age*63-j*2);
      g.globalAlpha=Math.sin(age/.7*Math.PI)*(hovered===data.id?.85:.55);
      spark(g,px,py,data.colors[3],j%2===0?2:1);
    }
  });
  g.globalAlpha=1;
}

function spark(g,x,y,ink,size){
  g.fillStyle=ink;
  g.fillRect(x-size,y,2*size+1,1);
  g.fillRect(x,y-size,1,2*size+1);
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
function creature(scene,data,x,y,z,stage,form,blink,excited,wear,pose){
  const [dark,base,soft,cream]=data.colors;
  const scale=[0,.85,1.08,1.25][stage];
  const coat=stage===3?(form===1?'#edab69':'#a8a5eb'):base;
  const box=(a,b,c,w,h,d,col)=>{
    const height=1+pose.breathe;
    const draw=w>=6&&h>=5&&d>=5?scene.rounded:scene.box;
    draw.call(scene,x+(a+b*pose.lean)*scale,y+b*scale*height,z+c*scale,w*scale,h*scale*height,d*scale,col);
  };
  box(-10,2,-7,20,15,15,coat);
  box(-12,15,-7,24,16,18,coat);

  box(-9,0,4,6,5,8,soft);box(3,0,4,6,5,8,soft);
  box(-7,16,10,14,7,4,cream);
  if(data.id==='dusk'){
    box(-10,30,-4,6,16+pose.ear,6,coat);box(3,30,-4,6,19-pose.ear,6,coat);
    box(-9,34,2,3,10,1,'#e6a4c6');box(4,34,2,3,12,1,'#e6a4c6');
    box(-4,4,-12,8,8,6,cream);
  }else{
    box(-12,28,-5,7,11,7,coat);box(5,28,-5,7,11,7,coat);
    box(-11,31,2,4,5,1,cream);box(6,31,2,4,5,1,cream);
    box(8+pose.ear,5,-16,8,8,13,coat);box(10+pose.ear,8,-20,6,7,5,cream);
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
  const moving=state.settings.motion;
  const hop=Math.max(0,Math.sin(t*(active?12:2.2)))**2;
  const jump=moving?hop*(active?11:state.pet.stage?5:2):0;
  if(data&&!state.pet.stage){
    const wiggle=moving?Math.sin(t*(active?14:3.1))*(active?.2:.06):0;
    shell(scene,data,0,jump,0,1.24,state.milestones.length>=2,wiggle,moving?Math.floor((Math.sin(t)+1)*6):0,1+(moving?Math.sin(t*3)*.07:0));
  }else if(data){
    const drift=moving?Math.sin(t*.85)*13:0;
    const blink=moving&&(t%4.6<.15||active&&t%1.4<.12);
    const pose={breathe:moving?Math.sin(t*3.5)*.07+hop*.055:0,
      lean:moving?Math.cos(t*.85)*.09:0,ear:moving?Math.sin(t*5)*2:0};
    creature(scene,data,drift,jump,0,state.pet.stage,state.pet.form,blink,active,state.equipped.wear,pose);
  }
  scene.draw(night?'#30364c7b':'#374e4870');
  if(moving){
    for(let i=0;i<(active?15:7);i++){
      const age=(t*(active?1.1:.31)+i*.137)%1;
      const x=Math.round((active?111:17)+(i*57)%(active?98:288)+Math.sin(t+i)*6);
      const y=Math.round((active?142:151)-age*(active?64:30)-(i*13)%22);
      g.globalAlpha=Math.sin(age*Math.PI)*(active?.94:.55);
      spark(g,x,y,i%2?'#ffe99c':'#fff9d5',active&&i%3===0?3:1);
    }
    g.globalAlpha=1;
  }
}
