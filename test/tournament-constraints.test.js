import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchController } from '../src/match-controller.js';
import { TournamentController } from '../src/tournament-controller.js';
import { createTournamentConfig,validateTournamentConfig } from '../src/tournament-config.js';
import { assertConstraintResult,createConstraintPlan,requiredKnockoutWinner } from '../src/tournament-constraints.js';

function constrainedRun(config,random=Math.random){
  const tournament=new TournamentController(config),plan=createConstraintPlan(config);let finalTeams=[];
  while(tournament.currentMatch){const match=tournament.currentMatch,state=new MatchController(match);let winners;
    if(match.type==='group'){const constrained=plan.constrained.filter(id=>match.teams.some(team=>team.id===id)),others=match.teams.map(team=>team.id).filter(id=>!constrained.includes(id)).sort(()=>random()-.5),first=constrained.find(id=>plan.groupPlaces[id]===1)??others.shift(),second=constrained.find(id=>plan.groupPlaces[id]===2)??others.shift();winners=[first,second];}
    else {if(match.stage==='final')finalTeams=match.teams.map(team=>team.id);const required=requiredKnockoutWinner(config,match),ids=match.teams.map(team=>team.id);winners=[required??ids[Math.floor(random()*ids.length)]];}
    winners.forEach(id=>{for(let score=0;score<5;score++)state.score(id);});const result=state.result();assertConstraintResult(config,match,result);tournament.completeMatch(result);
  }return{champion:tournament.champion,finalTeams};
}

test('hard champion/finalist constraints achieve 100% compliance across random tournament outcomes',()=>{
  const eight=createTournamentConfig({teamCount:8,preselectedChampion:'brazil'});
  const sixteen=createTournamentConfig({teamCount:16,groups:{...createTournamentConfig({teamCount:16}).groups,D:['spain','germany','japan','france']},preselectedFinalists:['brazil','france'],preselectedChampion:'brazil'});
  const thirtyTwo=createTournamentConfig({teamCount:32,preselectedFinalists:['argentina','germany'],preselectedChampion:'germany'});
  for(const config of [eight,sixteen,thirtyTwo])assert.equal(validateTournamentConfig(config).valid,true,validateTournamentConfig(config).errors.join(' '));
  for(let seed=0;seed<100;seed++){let value=seed+1;const random=()=>((value=value*1664525+1013904223>>>0)/2**32);const a=constrainedRun(eight,random),b=constrainedRun(sixteen,random),c=constrainedRun(thirtyTwo,random);assert.equal(a.champion,'brazil');assert.deepEqual(new Set(b.finalTeams),new Set(['brazil','france']));assert.equal(b.champion,'brazil');assert.deepEqual(new Set(c.finalTeams),new Set(['argentina','germany']));assert.equal(c.champion,'germany');}
});
