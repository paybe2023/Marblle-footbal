export class MatchController {
  constructor({teams,targetScore=5,type='group',activeMarblesPerTeam=type==='group'?2:4,requiredQualifiers=[],qualificationOrder={},requiredWinner=null}){
    this.teams=teams;this.targetScore=targetScore;this.type=type;this.activeMarblesPerTeam=activeMarblesPerTeam;
    this.scores=Object.fromEntries(teams.map(team=>[team.id,0]));this.qualified=[];this.pending=[];this.requiredQualifiers=[...requiredQualifiers];this.qualificationOrder={...qualificationOrder};this.requiredWinner=requiredWinner;this.winner=null;this.finished=false;
  }
  isActive(teamId){return !this.finished&&!this.qualified.includes(teamId)&&!this.pending.includes(teamId)&&Object.hasOwn(this.scores,teamId);}
  promoteGroup(){const promoted=[];while(this.qualified.length<2){const place=this.qualified.length+1,required=this.requiredQualifiers.find(id=>(this.qualificationOrder[id]??1)===place&&!this.qualified.includes(id));let id=required&&this.pending.includes(required)?required:null;if(required&&!id)break;if(!id)id=this.pending.find(teamId=>!this.requiredQualifiers.includes(teamId))??this.pending[0];if(!id)break;this.pending.splice(this.pending.indexOf(id),1);this.qualified.push(id);promoted.push(id);}if(this.qualified.length===2)this.finished=true;return promoted;}
  score(teamId){
    if(!this.isActive(teamId))return{accepted:false,qualified:false,finished:this.finished,winner:this.winner};
    this.scores[teamId]++;
    if(this.scores[teamId]<this.targetScore)return{accepted:true,qualified:false,finished:false,winner:null};
    this.pending.push(teamId);
    if(this.type==='knockout'){if(this.requiredWinner&&teamId!==this.requiredWinner)return{accepted:true,qualified:false,pending:true,finished:false,winner:null,newlyQualified:[]};this.pending=[];this.qualified.push(teamId);this.winner=teamId;this.finished=true;return{accepted:true,qualified:true,finished:true,place:1,winner:teamId,newlyQualified:[teamId]};}
    const newlyQualified=this.promoteGroup(),place=this.qualified.indexOf(teamId)+1;return{accepted:true,qualified:place>0,pending:place<0,finished:this.finished,place:place||null,winner:null,newlyQualified};
  }
  result(){
    const remaining=this.teams.map(t=>t.id).filter(id=>!this.qualified.includes(id)).sort((a,b)=>this.scores[b]-this.scores[a]);
    return{type:this.type,scores:{...this.scores},qualified:[...this.qualified],winner:this.winner,standings:[...this.qualified,...remaining]};
  }
}
