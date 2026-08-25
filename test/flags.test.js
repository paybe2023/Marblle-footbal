import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getFlag } from '../src/flag-resolver.js';
import { CONFEDERATIONS,TEAMS,TEAMS_BY_CONFEDERATION,TEAM_BY_ID } from '../src/team-data.js';
import { TOURNAMENT_CONFIG } from '../src/tournament-config.js';

const required={mexico:'MX','south-korea':'KR',senegal:'SN',egypt:'EG',france:'FR',iraq:'IQ',norway:'NO',brazil:'BR',argentina:'AR',germany:'DE',japan:'JP','united-states':'US',canada:'CA',iran:'IR','saudi-arabia':'SA',australia:'AU'};
const coverCases=['france','mexico','south-korea','senegal','iraq','norway','japan','brazil'];

test('central ISO resolver maps required countries to bundled SVG files',()=>{
  for(const [id,code] of Object.entries(required)){const team=TEAM_BY_ID[id];assert.ok(team,id);assert.equal(team.countryCode,code);assert.equal(team.flag,getFlag(code));const disk=fileURLToPath(new URL(`../public${team.flag}`,import.meta.url));assert.ok(existsSync(disk),disk);}
});

test('all 211 national teams have unique metadata and a bundled ISO-based flag',()=>{
  assert.equal(TEAMS.length,211);assert.equal(new Set(TEAMS.map(team=>team.id)).size,211);assert.equal(new Set(TEAMS.map(team=>team.shortName)).size,211);assert.equal(new Set(TEAMS.map(team=>team.countryCode)).size,211);
  TEAMS.forEach(team=>{assert.match(team.countryCode,/^[A-Z]{2}(?:-[A-Z]{3})?$/);assert.match(team.shortName,/^[A-Z]{3}$/);assert.ok(CONFEDERATIONS.includes(team.confederation));assert.equal(team.flag,getFlag(team.countryCode));const disk=fileURLToPath(new URL(`../public${team.flag}`,import.meta.url));assert.ok(existsSync(disk),disk);});
  assert.deepEqual(Object.fromEntries(CONFEDERATIONS.map(confederation=>[confederation,TEAMS_BY_CONFEDERATION[confederation].length])),{CAF:54,AFC:46,UEFA:55,CONMEBOL:10,CONCACAF:35,OFC:11});
  const ids=Object.values(TOURNAMENT_CONFIG.groups).flat();assert.equal(ids.length,32);assert.equal(new Set(ids).size,32);
});

test('representative marble flags all use the shared ISO source for cover rendering',()=>{
  coverCases.forEach(id=>{const team=TEAM_BY_ID[id];assert.ok(team,id);assert.equal(team.flag,getFlag(team.countryCode));});
});
