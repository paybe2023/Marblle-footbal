import { TEAMS } from './team-data.js';

export const TOURNAMENT_TYPES=Object.freeze(['CUSTOM','WORLD_CUP','AFCON','ASIAN_CUP','EURO','COPA_AMERICA','CONCACAF_GOLD_CUP','OFC_NATIONS_CUP']);
export const TOURNAMENT_PRESETS=Object.freeze({
  CUSTOM:Object.freeze({label:'CUSTOM',title:'MARBLE CHAMPIONS CUP',confederation:'ALL',defaultTeamCount:32,teamCounts:[8,16,32]}),
  WORLD_CUP:Object.freeze({label:'WORLD CUP',title:'FIFA WORLD CUP',confederation:'ALL',defaultTeamCount:32,teamCounts:[8,16,32]}),
  AFCON:Object.freeze({label:'AFCON',title:'Africa Cup of Nations',confederation:'CAF',defaultTeamCount:16,teamCounts:[8,16,32]}),
  ASIAN_CUP:Object.freeze({label:'ASIAN CUP',title:'AFC Asian Cup',confederation:'AFC',defaultTeamCount:16,teamCounts:[8,16,32]}),
  EURO:Object.freeze({label:'EURO',title:'UEFA European Championship',confederation:'UEFA',defaultTeamCount:16,teamCounts:[8,16,32]}),
  COPA_AMERICA:Object.freeze({label:'COPA AMERICA',title:'Copa América',confederation:'CONMEBOL',defaultTeamCount:8,teamCounts:[8,16]}),
  CONCACAF_GOLD_CUP:Object.freeze({label:'CONCACAF GOLD CUP',title:'CONCACAF Gold Cup',confederation:'CONCACAF',defaultTeamCount:16,teamCounts:[8,16,32]}),
  OFC_NATIONS_CUP:Object.freeze({label:'OFC NATIONS CUP',title:'OFC Nations Cup',confederation:'OFC',defaultTeamCount:8,teamCounts:[8]}),
});

export const CONFEDERATION_FILTERS=Object.freeze(['ALL','CAF','AFC','UEFA','CONMEBOL','CONCACAF','OFC']);
export function presetFor(type){return TOURNAMENT_PRESETS[type]??TOURNAMENT_PRESETS.CUSTOM;}
export function eligibleTeams(config){const preset=presetFor(config.tournamentType),filter=config.tournamentType==='CUSTOM'?(config.confederationFilter??'ALL'):preset.confederation;if(filter==='ALL'||(config.tournamentType==='COPA_AMERICA'&&config.allowInvitedTeams))return TEAMS;return TEAMS.filter(team=>team.confederation===filter);}
