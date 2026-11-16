'use strict';
const EGGS = [
  {id:'moss', name:'Moss Egg', theme:'Quiet & curious', colors:['#2b7063','#63bc86','#a3e5a4','#e5f8ae'], pet:'Fern', species:'Fox', forms:['Moonlit Fern','Suncrest Fern']},
  {id:'ember', name:'Ember Egg', theme:'Bright & bold', colors:['#a44657','#eb766c','#ffb275','#ffe3a1'], pet:'Pip', species:'Dragon', forms:['Starlight Pip','Solar Pip']},
  {id:'dusk', name:'Dusk Egg', theme:'Dreamy & gentle', colors:['#6450a2','#9b75d9','#c8a4ef','#f5d7ff'], pet:'Lumi', species:'Rabbit', forms:['Moonbeam Lumi','Daybreak Lumi']}
];
const PLACES = [
  {id:'pet-shop', name:'Pet Shop', icon:'♥', color:'rose', unlock:3},
  {id:'decor-shop', name:'Decor Shop', icon:'✿', color:'green', unlock:4},
  {id:'inventory', name:'Inventory', icon:'▣', color:'lavender', unlock:3},
  {id:'collection', name:'Pet Collection', icon:'◆', color:'blue', unlock:3},
  {id:'achievements', name:'Achievements', icon:'★', color:'yellow', unlock:1}
];
const ITEMS = [
  {id:'bow', shop:'pet-shop', name:'Berry Bow', icon:'🎀', price:30, slot:'wear'},
  {id:'crown', shop:'pet-shop', name:'Tiny Crown', icon:'♛', price:45, slot:'wear'},
  {id:'scarf', shop:'pet-shop', name:'Cloud Scarf', icon:'▰', price:35, slot:'wear'},
  {id:'ball', shop:'pet-shop', name:'Star Ball', icon:'✪', price:25, slot:'toy'},
  {id:'sprout', shop:'decor-shop', name:'Potted Sprout', icon:'✿', price:25, slot:'plant'},
  {id:'bench', shop:'decor-shop', name:'Meadow Bench', icon:'▤', price:35, slot:'furniture'},
  {id:'rug', shop:'decor-shop', name:'Berry Rug', icon:'▧', price:30, slot:'rug'},
  {id:'twilight', shop:'decor-shop', name:'Twilight Sky', icon:'☾', price:40, slot:'sky'},
  {id:'pumpkin', shop:'decor-shop', name:'Harvest Pumpkin', icon:'●', price:26, slot:'season'}
];
const ACHIEVEMENTS = [
  {id:'first', name:'First Step', text:'Complete your first savings goal.', coins:10, earned:m=>m.goals>=1},
  {id:'hatch', name:'Hello, Little One', text:'Complete three goals and hatch your egg.', coins:20, earned:m=>m.hatched},
  {id:'habit', name:'Steady Steps', text:'Record savings on three different days.', coins:15, earned:m=>m.days>=3},
  {id:'milestone', name:'Pocketful', text:'Record $50 in savings across your goals.', coins:20, earned:m=>m.saved>=5000},
  {id:'evolve', name:'In Full Bloom', text:'Discover an evolved companion.', coins:30, earned:m=>m.stage===3}
];
const CATEGORIES = ['Food','Travel','Fun','School','Gifts','Other'];
