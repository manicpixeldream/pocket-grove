'use strict';

const art = document.querySelector('#world').getContext('2d');
const rect = (ink,x,y,w,h) => { art.fillStyle=ink; art.fillRect(x,y,w,h); };
function shape(ink,x,y,rows,unit=1) {
  rows.forEach(([offset,width],index)=>rect(ink,x+offset*unit,y+index*unit,width*unit,unit));
}
function cloud(x,y) {
  rect('#ace1dc',x,y+9,55,9);
  rect('#f7ffeb',x+4,y+6,44,9);
  rect('#f7ffeb',x+13,y+2,27,11);
  rect('#fffdef',x+21,y-3,13,10);
  rect('#fffdef',x+29,y,15,9);
}
function tree(x,y,scale=1) {
  const part=(c,a,b,w,h)=>rect(c,x+a*scale,y+b*scale,w*scale,h*scale);
  part('#629782',20,18,5,38);
  part('#85a777',23,30,4,22);
  part('#4f9b83',3,10,41,27);
  part('#4f9b83',9,4,30,39);
  part('#4f9b83',15,0,18,45);
  part('#66b692',5,12,34,19);
  part('#66b692',13,5,23,27);
  part('#88c99a',13,8,17,9);
  part('#a2d79b',10,15,7,5);
  part('#77c092',26,21,10,7);
  part('#b8dfa0',7,22,3,3);
  part('#ffcf8e',31,13,3,3);
}
function flower(x,y,ink) {
  rect('#60a371',x,y,1,5);
  rect(ink,x-2,y-1,5,2);
  rect(ink,x,y-3,1,5);
  rect('#ffe59c',x,y,1,1);
}
function egg(eggData,x,y,crack=false) {
  const u=2;
  const [dark,base,light,shine]=eggData.colors;
  const shell=[[7,5],[5,9],[4,11],[3,13],[2,15],[2,15],[1,17],[1,17],[0,19],[0,19],[0,19],[0,19],[1,17],[2,15],[3,13],[5,9]];
  shape(dark,x,y,shell,u);
  shape(base,x,y+2,shell.slice(1,-1).map(([a,w])=>[a+1,w-2]),u);
  shape(light,x,y+4,[[7,5],[5,8],[4,9],[3,10],[3,9],[2,10],[2,9],[2,8],[2,7],[3,7]],u);
  rect(shine,x+10,y+9,5,3);
  rect(shine,x+7,y+13,4,5);
  rect(shine,x+13,y+19,4,4);
  rect(light,x+26,y+19,5,4);
  rect(light,x+22,y+24,4,3);
  if(crack) {
    [[19,1,2,8],[16,8,5,2],[15,10,2,6],[15,15,7,2],[21,17,2,6]].forEach(([a,b,w,h])=>rect(dark,x+a,y+b,w,h));
  }
}
function animal(data,x,y,stage,form,blink,excited,wear) {
  const [outline,base,light,highlight]=data.colors;
  const size=stage===1?1:stage===2?1.2:1.34;
  const block=(c,a,b,w,h)=>rect(c,Math.round(x+a*size),Math.round(y+b*size),Math.ceil(w*size),Math.ceil(h*size));
  const coat=stage===3?(form===1?'#f6ac69':'#aaa6ef'):base;
  if(data.id==='dusk') {
    block(outline,7,-10,8,22);block(outline,24,-10,8,22);
    block(coat,9,-8,4,19);block(coat,26,-8,4,19);
    block('#ffbad8',10,-5,2,12);block('#ffbad8',27,-5,2,12);
  } else {
    block(outline,5,0,9,15);block(outline,26,0,9,15);
    block(coat,7,3,6,12);block(coat,27,3,6,12);
    block(highlight,9,5,3,7);block(highlight,28,5,3,7);
  }
  if(data.id==='moss') {
    block(outline,30,22,16,12);block(coat,33,24,11,8);block(highlight,41,24,3,6);
  }
  if(data.id==='ember'||stage===3) {
    const wing=stage===3?(form===1?'#ffe08d':'#dfd5ff'):light;
    block(outline,-5,19,13,11);block(outline,31,19,13,11);
    block(wing,-4,17,9,10);block(wing,35,17,8,10);
    block(wing,-7,15,5,8);block(wing,41,15,5,8);
  }
  block(outline,4,11,32,21);block(outline,8,8,24,27);
  block(coat,6,13,28,17);block(coat,9,10,22,21);
  block(light,12,24,16,8);
  block(outline,8,31,8,5);block(outline,24,31,8,5);
  block(light,9,31,6,3);block(light,25,31,6,3);
  block('#342845',11,17,3,blink?1:4);block('#342845',26,17,3,blink?1:4);
  block('#f7acd0',8,22,5,2);block('#f7acd0',27,22,5,2);
  block('#5a3d61',18,23,4,excited?3:2);
  if(wear==='bow'){block('#d44c88',27,8,5,6);block('#ff8cbd',32,10,3,3);block('#d44c88',35,8,5,6);}
  if(wear==='crown'||stage===3){block('#ffcf61',15,5,12,4);block('#ffe58c',15,1,3,6);block('#ffe58c',20,0,3,6);block('#ffe58c',25,1,3,6);}
  if(wear==='scarf'){block('#83d4f5',10,28,20,4);block('#83d4f5',24,30,5,7);}
}
function star(x,y,color) {
  rect(color,x-3,y,7,1);rect(color,x,y-3,1,7);rect(color,x-1,y-1,3,3);
}
function paintWorld(now, state, reactionUntil) {
  const night=state.equipped.sky==='twilight';
  const sceneTime=now/1000;
  rect(night?'#7977ad':'#bdeae1',0,0,320,190);
  rect(night?'#8984b7':'#ceefe2',0,54,320,36);
  rect(night?'#a29cc6':'#e4f4de',0,82,320,21);
  shape(night?'#f9f4cf':'#fff0aa',250,16,[[5,15],[2,21],[0,25],[0,25],[0,25],[0,25],[2,21],[5,15]],2);
  if(!night){cloud(20,42);cloud(105,22);cloud(207,50);}
  else {for(let i=0;i<17;i++)star((i*87)%319,9+(i*23)%61,'#e9dcfb');}
  shape('#9acabd',0,77,[[22,132],[12,149],[5,166],[0,180]],5);
  shape('#84b5a1',168,85,[[8,16],[4,24],[1,29],[0,31]],5);
  rect('#90c99e',0,105,320,85);
  rect('#a9d8a0',0,119,320,71);
  shape('#c6dfa1',0,147,[[13,40],[9,48],[7,51],[6,54],[3,58],[0,64],[0,64],[0,64],[0,64]],5);
  tree(-7,72,1.05);tree(25,83,.78);tree(270,68,1.14);tree(246,88,.66);
  for(let i=0;i<47;i++){
    const x=(i*67+13)%318,y=112+(i*29)%77;
    if(y<130||x<94||x>228){
      rect(i%2?'#80bc89':'#d9e8a8',x,y,4,1);
      rect('#96c990',x+1,y-2,1,2);
      if(i%4===0)flower(x,y-2,['#fff1ca','#e99bc5','#f7ca71'][i%3]);
    }
  }
  shape('#84bb90',15,143,[[6,18],[2,26],[0,30],[0,30],[3,24],[8,14]],2);
  shape('#78bac0',17,144,[[6,16],[2,24],[0,28],[2,24],[5,18]],2);
  rect('#afdfd7',29,147,16,1);rect('#afdfd7',41,151,17,1);
  rect('#afe2aa',24,149,5,3);rect('#e6aec5',26,147,2,2);
  for(let i=0;i<4;i++){
    const x=257+i*13,y=119+(i%2);
    rect('#aa8762',x,y,4,15);rect('#e2bf86',x,y,3,11);
    if(i<3){rect('#c2a274',x+3,y+4,10,3);rect('#dfbe89',x+3,y+8,10,2);}
  }
  if(state.milestones.length>=4){
    flower(105,151,'#e393c0');flower(111,151,'#f9dc82');flower(219,143,'#f9dc82');
  }
  if(state.milestones.length>=7){
    flower(122,171,'#f3a4ce');flower(129,177,'#fff3cd');flower(198,177,'#f3a4ce');
  }
  const shadow=(x,y,w)=>shape('#86b887',x,y,[[2,w-4],[0,w],[2,w-4]],2);
  if(state.equipped.rug) {rect('#a5659e',119,146,82,19);rect('#d891bc',122,148,76,15);rect('#f5bdd9',125,151,70,9);}
  if(state.equipped.furniture){rect('#936446',209,128,34,5);rect('#c68e5c',209,134,34,6);rect('#765943',212,140,4,8);rect('#765943',236,140,4,8);}
  if(state.equipped.plant){rect('#ae7156',74,147,12,10);rect('#4b9d72',78,135,4,12);rect('#5eb77f',73,138,6,5);rect('#79ba72',81,135,6,6);}
  if(state.equipped.season){rect('#af6838',224,153,14,12);rect('#e69552',222,155,18,8);rect('#667f44',229,150,4,5);}
  if(state.equipped.toy){rect('#9d6ac4',202,153,11,10);star(207,158,'#ffdc83');}
  const active=now<reactionUntil;
  const bob=state.settings.motion?Math.round(active?Math.abs(Math.sin(sceneTime*12))*9:Math.sin(sceneTime*3)*1.25):0;
  const eggData=EGGS.find(entry=>entry.id===state.egg);
  if(!eggData){
    EGGS.forEach((entry,index)=>{
      const x=77+index*64;shadow(x,146,19);
      egg(entry,x,117-(state.settings.motion?Math.round(Math.sin(sceneTime*2+index)*2):0));
      star(x+33,111-index%2*7,'#fff7c7');
    });
  }else if(!state.pet.stage){
    const wiggle=state.settings.motion&&state.milestones.length?Math.round(Math.sin(sceneTime*12)*Math.max(0,Math.sin(sceneTime*1.1)-.55)*5):0;
    shadow(140,150,21);egg(eggData,141+wiggle,121-bob,state.milestones.length>=2);
  }else{
    const roam=state.settings.motion?Math.round(Math.sin(sceneTime*.8)*4):0;
    const stretch=state.settings.motion&&sceneTime%12>11.4?2:0;
    shadow(135,151,25);
    animal(eggData,(state.pet.stage===1?140:135)+roam,(state.pet.stage===1?117:105)-bob-stretch,state.pet.stage,state.pet.form,state.settings.motion&&sceneTime%4>.0&&sceneTime%4<.17,active,state.equipped.wear);
  }
  if(active||state.pet.stage){
    const sparks=active?10:Math.min(state.pet.stage+1,4);
    for(let i=0;i<sparks;i++){
      const drift=state.settings.motion?Math.round(Math.sin(sceneTime*3+i)*4):0;
      star(96+(i*39)%130+drift,97+(i*27)%53, i%2?'#fff3a9':'#fffbed');
    }
  }
}
