import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchController } from '../src/match-controller.js';
import { TournamentController } from '../src/tournament-controller.js';
import { createTournamentConfig,validateTournamentConfig } from '../src/tournament-config.js';

function finish(match,preferred=[]){
  const state=new MatchController(match),ordered=[...preferred.filter(id=>match.teams.some(t=>t.id===id)),...match.teams.map(t=>t.id).filter(id=>!preferred.includes(id))],winners=ordered.slice(0,match.type==='group'?2:1);
  winners.forEach(id=>{for(let i=0;i<5;i++)state.score(id);});return state.result();
}

function run(config){
  const tournament=new TournamentController(config),qualifiers=new Set(),preferred=[...new Set([config.preselectedChampion,...config.preselectedFinalists].filter(Boolean))];let matches=0;
  while(tournament.currentMatch){const match=tournament.currentMatch;assert.equal(match.activeMarblesPerTeam,match.type==='group'?2:4);assert.equal(match.teams.length*match.activeMarblesPerTeam,8);if(match.type==='knockout')match.teams.forEach(t=>assert.ok(qualifiers.has(t.id)));let matchPreferred=preferred;if(match.type==='group'&&config.preselectedFinalists[1]&&match.teams.some(t=>t.id===config.preselectedFinalists[1])&&!match.teams.some(t=>t.id===config.preselectedChampion)){const runner=config.preselectedFinalists[1],winner=match.teams.find(t=>t.id!==runner).id;matchPreferred=[winner,runner];}const result=finish(match,matchPreferred);if(match.type==='group')result.qualified.forEach(id=>qualifiers.add(id));tournament.completeMatch(result);matches++;}
  return {tournament,matches,qualifiers};
}

test('group controller freezes first qualifier and finishes on second',()=>{
  const match=new TournamentController().currentMatch,state=new MatchController(match);for(let i=0;i<5;i++)state.score(match.teams[0].id);assert.equal(state.isActive(match.teams[0].id),false);assert.equal(state.finished,false);for(let i=0;i<5;i++)state.score(match.teams[1].id);assert.equal(state.finished,true);assert.deepEqual(state.qualified,match.teams.slice(0,2).map(t=>t.id));
});

test('TEST 1: 8 teams, balanced, no finalists or champion',()=>{
  const config=createTournamentConfig({tournamentTitle:'EIGHT TEAM CUP',teamCount:8}),{tournament,matches,qualifiers}=run(config);assert.equal(matches,5);assert.equal(Object.keys(tournament.groupResults).length,2);assert.equal(qualifiers.size,4);assert.equal(tournament.bracket.roundOf16.length,0);assert.equal(tournament.bracket.quarterfinals.length,0);assert.equal(tournament.bracket.semifinals.length,2);assert.ok(tournament.champion);assert.equal(tournament.stage,'complete');
});

test('TEST 2: 16 teams, custom strengths, no predetermined winner',()=>{
  const base=createTournamentConfig({tournamentTitle:'SIXTEEN TEAM CUP',teamCount:16,teamStrengthEnabled:true}),config=createTournamentConfig({...base,teamStrengths:Object.fromEntries(Object.keys(base.teamStrengths).map((id,i)=>[id,40+(i%7)*8]))}),{tournament,matches,qualifiers}=run(config);assert.equal(matches,11);assert.equal(Object.keys(tournament.groupResults).length,4);assert.equal(qualifiers.size,8);assert.equal(tournament.bracket.quarterfinals.length,4);assert.equal(tournament.bracket.semifinals.length,2);assert.ok(tournament.champion);
});

test('TEST 3: 32 teams, custom strengths, finalists and champion',()=>{
  const base=createTournamentConfig({tournamentTitle:'MARBLE WORLD CUP',teamCount:32,teamStrengthEnabled:true,preselectedFinalists:['argentina','england'],preselectedChampion:'argentina'}),config=createTournamentConfig({...base,teamStrengths:Object.fromEntries(Object.keys(base.teamStrengths).map((id,i)=>[id,35+(i%10)*6]))}),check=validateTournamentConfig(config);assert.equal(check.valid,true,check.errors.join(' '));const {tournament,matches,qualifiers}=run(config);assert.equal(matches,23);assert.equal(qualifiers.size,16);assert.deepEqual(tournament.winners.final,['argentina']);assert.equal(tournament.champion,'argentina');assert.ok(tournament.winners.semifinals.includes('england'));
});

test('configuration rejects duplicate countries and impossible finalist/champion states',()=>{
  const duplicate=createTournamentConfig({teamCount:8});duplicate.groups.B[0]=duplicate.groups.A[0];assert.equal(validateTournamentConfig(duplicate).valid,false);
  const impossible=createTournamentConfig({teamCount:16,preselectedFinalists:['argentina','brazil'],preselectedChampion:'england'}),result=validateTournamentConfig(impossible);assert.equal(result.valid,false);assert.ok(result.errors.some(error=>error.includes('opening knockout')));assert.ok(result.errors.some(error=>error.includes('must be one')));
});
