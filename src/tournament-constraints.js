import { groupsForTeamCount } from './tournament-config.js';

const constrainedIds=config=>[...new Set([...(config.preselectedFinalists??[]),config.preselectedChampion].filter(Boolean))];
const openingHalf=(groupIndex,place)=>groupIndex%2===(place===1?0:1)?0:1;

export function createConstraintPlan(config){
  const letters=groupsForTeamCount(config.teamCount),finalists=[...(config.preselectedFinalists??[])],groupPlaces={};
  if(finalists.length===2){
    const groupIndex=id=>letters.findIndex(letter=>config.groups[letter].includes(id)),firstGroup=groupIndex(finalists[0]),secondGroup=groupIndex(finalists[1]);groupPlaces[finalists[0]]=1;
    groupPlaces[finalists[1]]=firstGroup===secondGroup?2:(openingHalf(secondGroup,1)!==openingHalf(firstGroup,1)?1:2);
  }
  if(config.preselectedChampion&&!groupPlaces[config.preselectedChampion])groupPlaces[config.preselectedChampion]=1;
  return{constrained:constrainedIds(config),finalists,champion:config.preselectedChampion??null,groupPlaces};
}

export function requiredKnockoutWinner(config,match){
  if(match.type!=='knockout')return null;const plan=createConstraintPlan(config),present=plan.constrained.filter(id=>match.teams.some(team=>team.id===id));
  if(match.stage==='final')return plan.champion??null;if(present.length>1)throw new Error(`Preselected finalists meet before the final in ${match.id}.`);return present[0]??null;
}

export function constraintAssistance(config,match,state,teamId){
  const plan=createConstraintPlan(config);if(!plan.constrained.includes(teamId))return 0;
  const scores=state.scores??{},leader=Math.max(0,...Object.values(scores)),score=scores[teamId]??0,deficit=Math.max(0,leader-score);
  if(match.type==='knockout')return requiredKnockoutWinner(config,match)===teamId?Math.min(1,.72+deficit*.09):0;
  const targetPlace=plan.groupPlaces[teamId]??1,alreadyQualified=state.qualified?.length??0;if(targetPlace===2&&alreadyQualified===0)return Math.min(.42,.2+deficit*.04);
  return Math.min(1,.68+deficit*.08+(leader>=4?.14:0));
}

export function assertConstraintResult(config,match,result){
  const plan=createConstraintPlan(config);
  if(match.type==='group'){for(const id of plan.constrained.filter(teamId=>match.teams.some(team=>team.id===teamId)))if(!result.qualified.includes(id))throw new Error(`${id} violated its required group qualification constraint.`);}
  else {const required=requiredKnockoutWinner(config,match);if(required&&result.winner!==required)throw new Error(`${required} violated its required ${match.stage} win constraint.`);}
  return true;
}
