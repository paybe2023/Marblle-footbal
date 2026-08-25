const STAGE_LABELS=Object.freeze({groups:'GROUP STAGE',roundOf16:'ROUND OF 16',quarterfinals:'QUARTERFINALS',semifinals:'SEMIFINALS',final:'FINAL',complete:'CHAMPION',champion:'CHAMPION'});
const STAGE_PATHS=Object.freeze({8:['groups','semifinals','final','complete'],16:['groups','quarterfinals','semifinals','final','complete'],32:['groups','roundOf16','quarterfinals','semifinals','final','complete']});

export function getStageDisplayName(currentStage,teamCount){
  const path=STAGE_PATHS[teamCount];if(path&&!path.includes(currentStage)&&currentStage!=='champion')throw new Error(`${currentStage} is not a valid stage for a ${teamCount}-team tournament.`);
  const label=STAGE_LABELS[currentStage];if(!label)throw new Error(`Unknown tournament stage: ${currentStage}`);return label;
}

export function getTournamentStagePath(teamCount){const path=STAGE_PATHS[teamCount];if(!path)throw new Error(`Unsupported tournament size: ${teamCount}`);return [...path];}

export function getCurrentGroupLabel(currentGroup){
  const group=String(currentGroup??'').trim().toUpperCase();if(!/^[A-H]$/.test(group))throw new Error(`Unknown tournament group: ${currentGroup}`);return`GROUP ${group}`;
}

export function getMatchHeaderLabel(currentStage,currentGroup,teamCount){return currentStage==='groups'?getCurrentGroupLabel(currentGroup):getStageDisplayName(currentStage,teamCount);}
