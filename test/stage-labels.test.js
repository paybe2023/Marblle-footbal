import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentGroupLabel,getMatchHeaderLabel,getStageDisplayName,getTournamentStagePath } from '../src/stage-labels.js';

const expected={
  8:['GROUP STAGE','SEMIFINALS','FINAL','CHAMPION'],
  16:['GROUP STAGE','QUARTERFINALS','SEMIFINALS','FINAL','CHAMPION'],
  32:['GROUP STAGE','ROUND OF 16','QUARTERFINALS','SEMIFINALS','FINAL','CHAMPION']
};

for(const [teamCount,labels] of Object.entries(expected))test(`${teamCount}-team stage labels follow controller state`,()=>assert.deepEqual(getTournamentStagePath(Number(teamCount)).map(stage=>getStageDisplayName(stage,Number(teamCount))),labels));

test('invalid stages cannot silently produce a wrong visible title',()=>assert.throws(()=>getStageDisplayName('quarterfinals',8),/not a valid stage/));

for(const [teamCount,groups] of [[8,'AB'],[16,'ABCD'],[32,'ABCDEFGH']])test(`${teamCount}-team group labels are derived from actual group state`,()=>groups.split('').forEach(group=>assert.equal(getMatchHeaderLabel('groups',group,teamCount),getCurrentGroupLabel(group))));

test('knockout headers never inherit a group label',()=>{assert.equal(getMatchHeaderLabel('semifinals','B',8),'SEMIFINALS');assert.equal(getMatchHeaderLabel('quarterfinals','D',16),'QUARTERFINALS');assert.equal(getMatchHeaderLabel('roundOf16','H',32),'ROUND OF 16');});
