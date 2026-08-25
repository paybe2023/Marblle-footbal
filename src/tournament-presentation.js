import { getCurrentGroupLabel,getStageDisplayName,getTournamentStagePath } from './stage-labels.js';

const STYLE={title:{fontFamily:'Barlow Condensed',fontSize:68,fontStyle:'bold',color:'#ffffff',letterSpacing:5},sub:{fontFamily:'Barlow Condensed',fontSize:34,fontStyle:'bold',color:'#65ddff',letterSpacing:4},team:{fontFamily:'Barlow Condensed',fontSize:34,fontStyle:'bold',color:'#e8f8ff'}};
const ROUND_SHORT={roundOf16:'R16',quarterfinals:'QF',semifinals:'SF',final:'F'};

export function buildBracketModel(teamCount,tournament){
  const rounds=getTournamentStagePath(teamCount).slice(1).map(stage=>stage==='complete'?'champion':stage),start=rounds[0],opening=(tournament.bracket[start]??[]).flat(),columns=[{round:start,nodes:opening.map(teamId=>({teamId,label:null}))}];
  for(let columnIndex=1;columnIndex<rounds.length;columnIndex++){
    const round=rounds[columnIndex],previous=rounds[columnIndex-1],count=Math.max(1,columns[columnIndex-1].nodes.length/2),known=round==='champion'?(tournament.champion?[tournament.champion]:[]):(tournament.winners[previous]??[]);
    columns.push({round,nodes:Array.from({length:count},(_,index)=>({teamId:known[index]??null,label:round==='champion'?'CHAMPION':`Winner ${ROUND_SHORT[previous]}${index+1}`}))});
  }
  return {rounds,columns};
}

export function calculateBracketLayout(model,safe={left:170,right:1750,top:335,bottom:870}){
  const columnCount=model.columns.length,startCount=model.columns[0].nodes.length,columnXs=model.columns.map((_,index)=>safe.left+130+index*((safe.right-safe.left-260)/(columnCount-1))),availableHeight=safe.bottom-safe.top,nodeGap=startCount>1?availableHeight/(startCount-1):availableHeight,nodeHeight=Math.min(startCount>=16?28:startCount>=8?36:44,nodeGap-4),nodeWidth=Math.min(260,(columnXs[1]-columnXs[0])-70),fontSize=startCount>=16?16:startCount>=8?19:23,flagW=startCount>=16?30:startCount>=8?36:44,flagH=flagW*2/3,dimensions={width:nodeWidth,height:nodeHeight,fontSize,flagW,flagH};
  const positions=[];positions[0]=model.columns[0].nodes.map((_,index)=>safe.top+index*nodeGap);for(let column=1;column<columnCount;column++)positions[column]=model.columns[column].nodes.map((_,index)=>(positions[column-1][index*2]+positions[column-1][index*2+1])/2);
  const connectors=[];for(let column=0;column<columnCount-1;column++){const fromX=columnXs[column]+nodeWidth/2,toX=columnXs[column+1]-nodeWidth/2,midX=(fromX+toX)/2;positions[column+1].forEach((targetY,index)=>connectors.push({column,fromX,toX,midX,yA:positions[column][index*2],yB:positions[column][index*2+1],targetY}));}
  return {safe,columnXs,positions,dimensions,connectors};
}

export class TournamentPresentation{
  constructor(scene){this.scene=scene;this.current=null;}
  flagKey(team){return`flag-${team.countryCode}`;}
  addBranding(container){
    const s=this.scene,brand=s.add.container(960,948);
    const icon=s.add.graphics();icon.fillStyle(0xff3045,.95);icon.fillRoundedRect(-116,-12,34,24,7);icon.fillStyle(0xffffff,1);icon.fillTriangle(-103,-7,-103,7,-92,0);
    const handle=s.add.text(-70,0,'@arshia.channel',{fontFamily:'Inter',fontSize:25,fontStyle:'bold',color:'#cdeeff',letterSpacing:1}).setOrigin(0,.5);
    brand.add([icon,handle]);brand.setAlpha(.76);container.add(brand);
  }
  titleSize(title){return Math.max(40,Math.min(60,Math.floor(1160/Math.max(18,title.length))));}
  base(title,subtitle=''){
    this.current?.destroy(true);const s=this.scene,c=s.add.container(0,0).setDepth(100).setAlpha(0);c.add(s.add.rectangle(960,540,1660,900,0x061b42,.96).setStrokeStyle(4,0x49dfff,.55));
    const tournamentTitle=s.tournamentConfig.tournamentTitle,fontSize=this.titleSize(tournamentTitle);c.add(s.add.text(960,130,tournamentTitle,{...STYLE.title,fontSize}).setOrigin(.5,0));
    c.add(s.add.text(960,205,title,STYLE.sub).setOrigin(.5,0));if(subtitle)c.add(s.add.text(960,252,subtitle,{...STYLE.sub,fontSize:24,color:'#bcefff'}).setOrigin(.5,0));this.addBranding(c);this.current=c;return c;
  }
  timed(container,duration,onDone){const s=this.scene;s.tweens.add({targets:container,alpha:1,duration:300});s.time.delayedCall(duration-350,()=>s.tweens.add({targets:container,alpha:0,duration:300,onComplete:()=>{container.destroy(true);if(this.current===container)this.current=null;onDone?.();}}));}
  teamRow(container,team,x,y,{fontSize=34,flagW=78,flagH=52,origin=0}={}){const s=this.scene;container.add(s.add.image(x,y,this.flagKey(team)).setDisplaySize(flagW,flagH));container.add(s.add.text(x+flagW*.72,y,team.name,{...STYLE.team,fontSize}).setOrigin(origin,.5));}
  showTournamentIntro(onDone){const c=this.base('MARBLE FOOTBALL');const s=this.scene,path=getTournamentStagePath(s.tournamentConfig.teamCount).map(stage=>getStageDisplayName(stage,s.tournamentConfig.teamCount)).join('  →  ');c.add(s.add.text(960,430,`${s.tournamentConfig.teamCount} TEAMS  •  ${s.tournament.groups.length} GROUPS`,{...STYLE.team,fontSize:44,letterSpacing:3}).setOrigin(.5));c.add(s.add.text(960,555,path,{...STYLE.sub,fontSize:26}).setOrigin(.5));c.add(s.add.text(960,680,'FIRST TO 5',{...STYLE.title,fontSize:58,color:'#ffd447'}).setOrigin(.5));this.timed(c,4000,onDone);}
  showGroupIntro(match,onDone){const c=this.base(getCurrentGroupLabel(match.group),`${getStageDisplayName('groups',this.scene.tournamentConfig.teamCount)} INTRO`);match.teams.forEach((team,i)=>this.teamRow(c,team,720,340+i*145,{fontSize:40,flagW:105,flagH:70}));this.timed(c,3500,onDone);}
  showGroupResult(match,result,onDone){const c=this.base(getCurrentGroupLabel(match.group),`${getStageDisplayName('groups',this.scene.tournamentConfig.teamCount)} — FINAL`),s=this.scene,byId=Object.fromEntries(match.teams.map(t=>[t.id,t]));result.standings.forEach((id,i)=>{const team=byId[id],qualified=i<2,y=320+i*145;c.add(s.add.image(470,y,this.flagKey(team)).setDisplaySize(90,60));c.add(s.add.text(545,y,`${i+1}.  ${team.name}`,{...STYLE.team,fontSize:35}).setOrigin(0,.5));c.add(s.add.text(1240,y,String(result.scores[id]),{...STYLE.team,fontSize:42,color:'#ffffff'}).setOrigin(.5));c.add(s.add.text(1390,y,qualified?'QUALIFIED':'ELIMINATED',{...STYLE.team,fontSize:24,color:qualified?'#62ffad':'#ff7691'}).setOrigin(0,.5));});this.timed(c,3000,onDone);}
  bracketNode(container,node,x,y,dimensions){
    const s=this.scene,{width,height,fontSize,flagW,flagH}=dimensions,g=s.add.graphics();g.fillStyle(node.teamId?0x0c2855:0x071a3c,node.teamId ? .92 : .72);g.fillRoundedRect(x-width/2,y-height/2,width,height,7);g.lineStyle(2,node.teamId?0x49dfff:0x31527d,node.teamId ? .55 : .5);g.strokeRoundedRect(x-width/2,y-height/2,width,height,7);container.add(g);
    if(node.teamId){const team=s.tournament.teamById[node.teamId],nameSize=Math.max(13,fontSize-Math.max(0,team.name.length-17)*.32);container.add(s.add.image(x-width/2+flagW/2+8,y,this.flagKey(team)).setDisplaySize(flagW,flagH));container.add(s.add.text(x-width/2+flagW+16,y,team.name,{...STYLE.team,fontSize:nameSize}).setOrigin(0,.5));}
    else {container.add(s.add.circle(x-width/2+15,y,4,0x65ddff,.65));container.add(s.add.text(x-width/2+28,y,node.label,{...STYLE.team,fontSize:fontSize-1,color:'#9fdff2',fontStyle:'bold'}).setOrigin(0,.5));}
  }
  showBracket(onDone){
    const s=this.scene,stage=getStageDisplayName(s.tournament.stage,s.tournamentConfig.teamCount),c=this.base(stage,'TOURNAMENT BRACKET'),model=buildBracketModel(s.tournamentConfig.teamCount,s.tournament),layout=calculateBracketLayout(model),{columnXs,positions,dimensions,connectors}=layout,columnCount=model.columns.length,startCount=model.columns[0].nodes.length,{width:nodeWidth}=dimensions;
    model.columns.forEach((column,index)=>c.add(s.add.text(columnXs[index],292,getStageDisplayName(column.round==='champion'?'complete':column.round,s.tournamentConfig.teamCount),{...STYLE.sub,fontSize:columnCount===5?19:22,letterSpacing:2}).setOrigin(.5)));
    const lines=s.add.graphics();lines.lineStyle(startCount>=16?3:4,0x65ddff,.72);connectors.forEach(({fromX,toX,midX,yA,yB,targetY})=>{lines.beginPath();lines.moveTo(fromX,yA);lines.lineTo(midX,yA);lines.lineTo(midX,yB);lines.lineTo(fromX,yB);lines.moveTo(midX,targetY);lines.lineTo(toX,targetY);lines.strokePath();});c.add(lines);
    model.columns.forEach((column,columnIndex)=>column.nodes.forEach((node,nodeIndex)=>this.bracketNode(c,node,columnXs[columnIndex],positions[columnIndex][nodeIndex],dimensions)));
    this.timed(c,5000,onDone);
  }
  showMatchup(match,onDone){const c=this.base(getStageDisplayName(match.stage,this.scene.tournamentConfig.teamCount),match.stage==='final'?'THE FINAL':'UPCOMING MATCH'),s=this.scene,[a,b]=match.teams;c.add(s.add.image(590,490,this.flagKey(a)).setDisplaySize(220,147));c.add(s.add.text(590,615,a.name,{...STYLE.team,fontSize:45}).setOrigin(.5));c.add(s.add.text(960,510,'VS',{...STYLE.title,fontSize:76,color:'#ffd447'}).setOrigin(.5));c.add(s.add.image(1330,490,this.flagKey(b)).setDisplaySize(220,147));c.add(s.add.text(1330,615,b.name,{...STYLE.team,fontSize:45}).setOrigin(.5));this.timed(c,match.stage==='final'||match.stage==='semifinals'?4000:2500,onDone);}
  showKnockoutResult(match,result,onDone){const winner=match.teams.find(t=>t.id===result.winner),c=this.base(getStageDisplayName(match.stage,this.scene.tournamentConfig.teamCount),'WINNER'),s=this.scene;c.add(s.add.image(960,460,this.flagKey(winner)).setDisplaySize(260,173));c.add(s.add.text(960,650,winner.name,{...STYLE.title,fontSize:62,color:'#ffd447'}).setOrigin(.5));this.timed(c,2500,onDone);}
  showChampion(team){const c=this.base(getStageDisplayName('complete',this.scene.tournamentConfig.teamCount)),s=this.scene;c.add(s.add.image(960,420,this.flagKey(team)).setDisplaySize(360,240));c.add(s.add.text(960,610,team.name,{...STYLE.title,fontSize:76,color:'#ffd447'}).setOrigin(.5));const cup=s.add.graphics();cup.fillStyle(0xffd447,1);cup.fillRoundedRect(910,720,100,75,18);cup.fillRect(947,790,26,48);cup.fillRoundedRect(900,835,120,22,8);cup.lineStyle(12,0xffd447,1);cup.strokeCircle(900,750,34);cup.strokeCircle(1020,750,34);c.add(cup);s.tweens.add({targets:c,alpha:1,duration:500});}
  showEndCard(onDone){const c=this.base('SUBSCRIBE FOR MORE MARBLE FOOTBALL'),s=this.scene,brand=s.add.container(960,540);const icon=s.add.graphics();icon.fillStyle(0xff3045,1);icon.fillRoundedRect(-245,-37,94,68,18);icon.fillStyle(0xffffff,1);icon.fillTriangle(-209,-22,-209,17,-178,-2);brand.add([icon,s.add.text(-125,0,'@arshia.channel',{...STYLE.title,fontSize:58}).setOrigin(0,.5)]);c.add(brand);this.timed(c,3500,onDone);}
}
