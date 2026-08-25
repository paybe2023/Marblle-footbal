import { TEAM_BY_ID } from './team-data.js';
import { TOURNAMENT_CONFIG,groupsForTeamCount,validateTournamentConfig } from './tournament-config.js';
import { getStageDisplayName } from './stage-labels.js';
import { createConstraintPlan,requiredKnockoutWinner } from './tournament-constraints.js';

const START_ROUND={8:'semifinals',16:'quarterfinals',32:'roundOf16'};
const NEXT_ROUND={roundOf16:'quarterfinals',quarterfinals:'semifinals',semifinals:'final'};

export class TournamentController {
  constructor(config=TOURNAMENT_CONFIG,teamById=TEAM_BY_ID){
    const checked=validateTournamentConfig(config,teamById);if(!checked.valid)throw new Error(checked.errors.join(' '));
    this.config=checked.config;this.teamById=teamById;this.groups=groupsForTeamCount(this.config.teamCount);this.stage='groups';this.groupIndex=0;this.matchIndex=0;this.groupResults={};
    this.bracket={roundOf16:[],quarterfinals:[],semifinals:[],final:[]};this.winners={roundOf16:[],quarterfinals:[],semifinals:[],final:[]};this.knockoutRound=null;this.champion=null;this.currentMatch=this.makeGroupMatch(this.groups[0]);
  }
  teams(ids){return ids.map(id=>{const team=this.teamById[id];if(!team)throw new Error(`Unknown team: ${id}`);return team;});}
  makeGroupMatch(group){const plan=createConstraintPlan(this.config),requiredQualifiers=plan.constrained.filter(id=>this.config.groups[group].includes(id)).sort((a,b)=>(plan.groupPlaces[a]??1)-(plan.groupPlaces[b]??1));return{id:`group-${group}`,type:'group',stage:'groups',label:`GROUP ${group}`,group,teams:this.teams(this.config.groups[group]),activeMarblesPerTeam:2,targetScore:this.config.targetScore,requiredQualifiers,qualificationOrder:Object.fromEntries(requiredQualifiers.map(id=>[id,plan.groupPlaces[id]??1]))};}
  makeKnockoutMatch(round,index,ids){const match={id:`${round}-${index+1}`,type:'knockout',stage:round,label:getStageDisplayName(round,this.config.teamCount),round,index,teams:this.teams(ids),activeMarblesPerTeam:4,targetScore:this.config.targetScore};match.requiredWinner=requiredKnockoutWinner(this.config,match);return match;}
  completeMatch(result){if(!this.currentMatch)throw new Error('No active match');return this.currentMatch.type==='group'?this.completeGroup(result):this.completeKnockout(result);}
  completeGroup(result){
    if(result.qualified?.length!==2)throw new Error('A group must produce exactly two qualifiers');const group=this.currentMatch.group;this.groupResults[group]={winner:result.qualified[0],runnerUp:result.qualified[1],standings:[...result.standings],scores:{...result.scores}};this.groupIndex++;
    if(this.groupIndex<this.groups.length){this.currentMatch=this.makeGroupMatch(this.groups[this.groupIndex]);return this.currentMatch;}
    const first=START_ROUND[this.config.teamCount];this.stage=first;this.knockoutRound=first;this.matchIndex=0;this.bracket[first]=this.buildOpeningRound();this.currentMatch=this.makeKnockoutMatch(first,0,this.bracket[first][0]);return this.currentMatch;
  }
  buildOpeningRound(){
    const g=this.groupResults,pairs=[];for(let i=0;i<this.groups.length;i+=2){const a=this.groups[i],b=this.groups[i+1];pairs.push([g[a].winner,g[b].runnerUp]);}
    for(let i=0;i<this.groups.length;i+=2){const a=this.groups[i],b=this.groups[i+1];pairs.push([g[b].winner,g[a].runnerUp]);}return pairs;
  }
  completeKnockout(result){
    if(!result.winner)throw new Error('A knockout match must produce a winner');const round=this.knockoutRound;this.winners[round].push(result.winner);this.matchIndex++;
    if(this.matchIndex<this.bracket[round].length){this.currentMatch=this.makeKnockoutMatch(round,this.matchIndex,this.bracket[round][this.matchIndex]);return this.currentMatch;}
    if(round==='final'){this.champion=result.winner;this.stage='complete';this.currentMatch=null;return null;}
    const next=NEXT_ROUND[round];this.bracket[next]=[];for(let i=0;i<this.winners[round].length;i+=2)this.bracket[next].push([this.winners[round][i],this.winners[round][i+1]]);this.stage=next;this.knockoutRound=next;this.matchIndex=0;this.currentMatch=this.makeKnockoutMatch(next,0,this.bracket[next][0]);return this.currentMatch;
  }
  snapshot(){return{stage:this.stage,currentGroup:this.currentMatch?.group??null,currentMatch:this.currentMatch?.id??null,groupResults:structuredClone(this.groupResults),bracket:structuredClone(this.bracket),winners:structuredClone(this.winners),champion:this.champion};}
}
