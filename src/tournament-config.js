import { TEAM_BY_ID } from './team-data.js';
import { getFlag } from './flag-resolver.js';
import { CONFEDERATION_FILTERS,TOURNAMENT_TYPES,eligibleTeams,presetFor } from './tournament-presets.js';

export const TEAM_COUNTS=Object.freeze([8,16,32]);
export const GROUP_LETTERS=Object.freeze('ABCDEFGH'.split(''));
export const groupsForTeamCount=teamCount=>GROUP_LETTERS.slice(0,teamCount/4);

const seeds={
  ALL:['argentina','mexico','poland','saudi-arabia','brazil','cameroon','serbia','switzerland','england','united-states','egypt','iran','spain','germany','japan','costa-rica','portugal','ghana','uruguay','south-korea','belgium','canada','morocco','croatia','france','senegal','iraq','norway','netherlands','ecuador','qatar','australia'],
  CAF:['nigeria','egypt','morocco','senegal','ghana','cameroon','tunisia','algeria','mali','ivory-coast','south-africa','dr-congo','angola','zambia','burkina-faso','cape-verde'],
  AFC:['iran','japan','saudi-arabia','iraq','south-korea','qatar','australia','uzbekistan','uae','china','jordan','oman','bahrain','syria','thailand','vietnam'],
  UEFA:['france','england','spain','germany','italy','portugal','netherlands','belgium','croatia','switzerland','denmark','poland','ukraine','turkiye','serbia','austria'],
  CONMEBOL:['argentina','brazil','uruguay','colombia','ecuador','chile','peru','paraguay','venezuela','bolivia'],
  CONCACAF:['mexico','united-states','canada','costa-rica','panama','jamaica','honduras','el-salvador','guatemala','trinidad-and-tobago','haiti','curacao','suriname','nicaragua','dominican-republic','cuba'],
  OFC:['new-zealand','fiji','solomon-islands','tahiti','new-caledonia','papua-new-guinea','vanuatu','samoa','tonga','cook-islands','american-samoa']
};

function defaultTeamIds(config){const pool=eligibleTeams(config),poolIds=new Set(pool.map(team=>team.id)),seed=seeds[config.tournamentType==='CUSTOM'?'ALL':presetFor(config.tournamentType).confederation]??seeds.ALL,ordered=[...seed.filter(id=>poolIds.has(id)),...pool.map(team=>team.id).filter(id=>!seed.includes(id))];return [...ordered.slice(0,config.teamCount),...Array(Math.max(0,config.teamCount-ordered.length)).fill('')];}
function makeGroups(config){const ids=defaultTeamIds(config);return Object.fromEntries(groupsForTeamCount(config.teamCount).map((letter,index)=>[letter,ids.slice(index*4,index*4+4)]));}

export function createTournamentConfig(overrides={}){
  const tournamentType=TOURNAMENT_TYPES.includes(overrides.tournamentType)?overrides.tournamentType:'WORLD_CUP',preset=presetFor(tournamentType),teamCount=Number(overrides.teamCount??preset.defaultTeamCount),confederationFilter=tournamentType==='CUSTOM'?(overrides.confederationFilter??'ALL'):preset.confederation,allowInvitedTeams=tournamentType==='COPA_AMERICA'&&Boolean(overrides.allowInvitedTeams);
  const base={tournamentType,tournamentTitle:String(overrides.tournamentTitle??preset.title).trim(),confederationFilter,allowInvitedTeams,teamCount},groups=overrides.groups?Object.fromEntries(groupsForTeamCount(teamCount).map(letter=>[letter,[...(overrides.groups[letter]??[])]])):makeGroups(base),selected=Object.values(groups).flat().filter(Boolean);
  return {...base,groups,targetScore:5,teamStrengthEnabled:Boolean(overrides.teamStrengthEnabled),teamStrengths:Object.fromEntries(selected.map(id=>[id,Number(overrides.teamStrengths?.[id]??50)])),preselectedFinalists:[...(overrides.preselectedFinalists??[])],preselectedChampion:overrides.preselectedChampion??null};
}

export function validateTournamentConfig(input,teamById=TEAM_BY_ID){
  const errors=[],config=createTournamentConfig(input),letters=groupsForTeamCount(config.teamCount),preset=presetFor(config.tournamentType),allowedIds=new Set(eligibleTeams(config).map(team=>team.id));
  if(!config.tournamentTitle)errors.push('Tournament title is required.');
  if(config.tournamentType==='CUSTOM'&&!CONFEDERATION_FILTERS.includes(config.confederationFilter))errors.push('Choose a valid confederation filter.');
  if(!preset.teamCounts.includes(config.teamCount))errors.push(`${preset.label} supports ${preset.teamCounts.join(', ')} teams.`);
  if(Object.keys(config.groups).length!==letters.length)errors.push(`Exactly ${letters.length} groups are required.`);
  letters.forEach(letter=>{if(!Array.isArray(config.groups[letter])||config.groups[letter].length!==4)errors.push(`Group ${letter} must contain exactly 4 teams.`);});
  const selected=letters.flatMap(letter=>config.groups[letter]??[]);
  if(selected.length!==config.teamCount||selected.some(id=>!id))errors.push(`Exactly ${config.teamCount} teams must be selected.`);
  if(new Set(selected).size!==selected.length)errors.push('A country can only appear once in the tournament.');
  selected.filter(Boolean).forEach(id=>{const team=teamById[id];if(!team)errors.push(`Unknown team: ${id}`);else {if(!allowedIds.has(id))errors.push(`${team.name} is outside the active ${config.confederationFilter} team pool.`);try{if(team.flag!==getFlag(team.countryCode))errors.push(`Flag source mismatch: ${team.name}`);}catch{errors.push(`Invalid flag source: ${team.name}`);}}});
  if(config.teamStrengthEnabled)selected.filter(Boolean).forEach(id=>{const value=config.teamStrengths[id];if(!Number.isFinite(value)||value<1||value>100)errors.push(`Team strength for ${teamById[id]?.name??id} must be 1–100.`);});
  if(config.preselectedFinalists.length!==0&&config.preselectedFinalists.length!==2)errors.push('Choose exactly two finalists or disable preselected finalists.');
  if(new Set(config.preselectedFinalists).size!==config.preselectedFinalists.length)errors.push('Preselected finalists must be different teams.');
  config.preselectedFinalists.forEach(id=>{if(!selected.includes(id))errors.push('Every preselected finalist must participate in the tournament.');});
  if(config.preselectedFinalists.length===2){const groupOf=id=>letters.findIndex(letter=>(config.groups[letter]??[]).includes(id)),[a,b]=config.preselectedFinalists.map(groupOf);if(a!==b&&Math.floor(a/2)===Math.floor(b/2))errors.push('Those finalists can meet in the opening knockout round. Choose teams from the same group or different group pairs.');}
  if(config.preselectedChampion&&!selected.includes(config.preselectedChampion))errors.push('The preselected champion must participate in the tournament.');
  if(config.preselectedChampion&&config.preselectedFinalists.length===2&&!config.preselectedFinalists.includes(config.preselectedChampion))errors.push('The preselected champion must be one of the two preselected finalists.');
  return {valid:errors.length===0,errors,config};
}

export const TOURNAMENT_CONFIG=Object.freeze(createTournamentConfig());
