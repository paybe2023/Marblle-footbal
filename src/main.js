import Phaser from 'phaser';
import './style.css';
import { MATCH_CONFIG as CFG } from './config.js';
import { MatchController } from './match-controller.js';
import { TournamentController } from './tournament-controller.js';
import { TEAMS } from './team-data.js';
import { TournamentPresentation } from './tournament-presentation.js';
import { showTournamentSetup } from './tournament-setup.js';
import { detectDeviceMode } from './device-mode.js';
import { getMatchHeaderLabel,getStageDisplayName } from './stage-labels.js';
import { GOAL_GEOMETRY,legalGoalCrossing } from './goal-detection.js';
import { assertConstraintResult,constraintAssistance } from './tournament-constraints.js';
import { APP_MODE } from './app-mode.js';

const [{mediaRuntime},{showRuntimeLaunch}]=import.meta.env.PROD
  ?await Promise.all([import('./online-media-runtime.js'),import('./online-runtime-launch.js')])
  :await Promise.all([import('./media-runtime.js'),import('./runtime-launch.js')]);

const { width: W, height: H } = CFG.arena;
const C = { navy: 0x071a3c, ink: 0x061229, white: 0xf7fbff, cyan: 0x2bd9fe, blue: 0x1678ff, yellow: 0xffd447, coral: 0xff5578, mint: 0x39e6ae, violet: 0x8a65ff };

class MarbleFootballScene extends Phaser.Scene {
  constructor(tournamentConfig) { super('match');this.tournamentConfig=tournamentConfig; }

  tournamentTeams(){const selected=new Set(Object.values(this.tournamentConfig.groups).flat());return TEAMS.filter(team=>selected.has(team.id));}

  preload(){this.tournamentTeams().forEach(team=>this.load.svg(`flag-${team.countryCode}`,team.flag,{width:256,height:192}));}

  create() {
    this.tournament = new TournamentController(this.tournamentConfig);
    this.currentMatch = this.tournament.currentMatch;
    this.currentTeams = this.currentMatch.teams;
    this.state = new MatchController(this.currentMatch);
    this.marbles = new Map();
    this.teamCounts = Object.fromEntries(this.currentTeams.map(t => [t.id, 0]));
    this.spawnTimers = [];
    this.respawnQueue = [];
    this.entryQueue = [];
    this.entryBatchSize = 2;
    this.entryBatchInterval = 450;
    this.lastEntryRelease = -Infinity;
    this.lastEntryTeam = null;
    this.entryReleaseHistory = [];
    this.pendingSpawns = Object.fromEntries(this.currentTeams.map(t => [t.id, 0]));
    this.matchPaused = true;
    this.powerFan = null;
    this.recoveryShooter = null;
    this.sceneryWaves = [];
    this.goalkeeper = null;
    this.telemetry = { spawned: 0, goals: 0, totalGoals:0, eliminations: 0, seaEliminations: 0, directSpawnToSea:0, grassContacts: 0, recoveryHits: 0, recoveryTurns: 0, missesAbove: 0, missesBelow: 0, nudges: 0, stuckResets: 0, grassRecoveries:0, maxOrbitOccupancy: 0, launcherShots: 0, launcherHits: 0, entryReleased:0, entryQueueWaitTotal:0, maxEntryQueue:0, maxEntryBatch:0, firstPassFanContacts:0, firstPassGapFalls:0, goalkeeperSaves: 0, maxMarbleSpeed: 0, averageFps:60, minimumFps:60, frameSamples:0, matchDurations:[], stuckLocations: [] };
    this.lastTelemetryUpdate = 0;
    this.recordingPerformance={startedAt:0,first5Total:0,first5Count:0,first15Total:0,first15Count:0,total:0,count:0,minimum:60};
    this.matchStart = this.time.now;
    this.makeTextures();
    this.drawBackdrop();
    this.buildArena();
    this.buildBroadcastUI();
    this.createSensors();
    this.matter.world.setBounds(-120, CFG.arena.playTop, W + 240, H + 180, 64, true, false, false, false);
    this.matter.world.on('collisionstart', this.onCollision, this);
    window.__MARBLE_DEBUG__ = { snapshot: () => this.debugSnapshot() };
    this.telemetryElement=document.createElement('output');this.telemetryElement.id='physics-telemetry';this.telemetryElement.hidden=true;document.body.appendChild(this.telemetryElement);
    this.presentation=new TournamentPresentation(this);mediaRuntime.attachStage(this.game.canvas,this.tournamentConfig).then(()=>this.presentation.showTournamentIntro(()=>this.presentation.showGroupIntro(this.currentMatch,()=>this.startCurrentMatch())));
  }

  makeTextures() {
    this.tournamentTeams().forEach(team => {
      const canvas = this.textures.createCanvas(`marble-${team.id}`, 64, 64);
      const ctx = canvas.context;
      ctx.beginPath(); ctx.arc(32, 32, 29, 0, Math.PI * 2); ctx.clip();
      this.drawFlag(ctx, team);
      const grad = ctx.createRadialGradient(19, 14, 2, 31, 31, 32); grad.addColorStop(0, '#ffffffc8'); grad.addColorStop(.27, '#ffffff20'); grad.addColorStop(1, '#00000056');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(32, 32, 29, 0, Math.PI * 2); ctx.stroke();
      canvas.refresh();
    });
  }

  drawFlag(ctx, team) {
    const image=this.textures.get(`flag-${team.countryCode}`).getSourceImage();
    const sourceWidth=image.naturalWidth||image.videoWidth||image.width;
    const sourceHeight=image.naturalHeight||image.videoHeight||image.height;
    const faceSize=62;
    const scale=Math.max(faceSize/sourceWidth,faceSize/sourceHeight);
    const cropWidth=faceSize/scale,cropHeight=faceSize/scale;
    const sourceX=(sourceWidth-cropWidth)/2,sourceY=(sourceHeight-cropHeight)/2;
    // Cover the clipped face with a slight bleed so antialiasing never exposes empty pixels.
    ctx.drawImage(image,sourceX,sourceY,cropWidth,cropHeight,1,1,62,62);
  }

  drawBackdrop() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0f6bc7, 0x0f6bc7, 0x31b9ea, 0x31b9ea, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0xffffff, .08); for (let y = 270; y < H; y += 90) g.fillRect(0, y, W, 2);
    g.fillStyle(0x03142f, .82); g.fillRect(0, 0, W, 224);
    g.fillStyle(0xffffff, .06); g.fillRect(0, 214, W, 10);
    const clouds=[[145,310,.72],[410,430,.92],[690,300,.66],[965,410,.82],[1240,290,.7],[1490,455,.88],[1735,325,.68],[1110,585,.62]];
    clouds.forEach(([x,y,scale])=>{
      const cloud=this.add.graphics({x,y}).setDepth(.35).setScale(scale);
      cloud.fillStyle(0xb9ddf2,.22);cloud.fillEllipse(3,12,142,38);
      cloud.fillStyle(0xffffff,.9);cloud.fillEllipse(0,4,150,42);cloud.fillCircle(-45,-2,27);cloud.fillCircle(-9,-17,38);cloud.fillCircle(31,-7,31);cloud.fillCircle(55,4,20);
      cloud.fillStyle(0xeaf7ff,.34);cloud.fillEllipse(4,13,126,18);
    });
    const watermark=this.add.container(W/2,H/2).setDepth(.5).setScale(1.35).setAlpha(.34);
    const mark=this.add.graphics();
    mark.fillStyle(0x061229,.42);mark.fillRoundedRect(-205,-10,35,25,7);
    mark.fillStyle(0xff2d3f,.78);mark.fillRoundedRect(-207,-13,35,25,7);
    mark.fillStyle(0xffffff,.9);mark.fillTriangle(-194,-8,-194,7,-182,-.5);
    const etchedShadow=this.add.text(-158,1,'@arshia.channel',{fontFamily:'Inter',fontSize:32,fontStyle:'bold',color:'#061229',letterSpacing:1}).setOrigin(0,.5).setPosition(-156,3).setAlpha(.52);
    const etchedText=this.add.text(-158,1,'@arshia.channel',{fontFamily:'Inter',fontSize:32,fontStyle:'bold',color:'#e7faff',letterSpacing:1}).setOrigin(0,.5).setAlpha(.78);
    watermark.add([mark,etchedShadow,etchedText]);
  }

  buildArena() {
    this.drawLandscape();
    const mainFanPosition={x:330,y:675};
    this.addEntryChannel();
    // The continuous fan is the arena's only active propulsion mechanism.
    this.addPowerFan(mainFanPosition.x,mainFanPosition.y);
    this.addRecoveryShooter(780, 850);

    // Clean rectangular football goal with a thin horizontal crossbar.
    this.matter.add.rectangle(1786,594,252,8,{isStatic:true,friction:0,restitution:.82,label:'goal-out',chamfer:{radius:2}});
    this.matter.add.rectangle(1906,758,8,328,{isStatic:true,friction:0,restitution:.82,label:'goal-out',chamfer:{radius:2}});
    this.matter.add.rectangle(1783,918,258,8,{isStatic:true,friction:.002,restitution:.72,label:'goal-frame',chamfer:{radius:2}});
    this.drawGoal();
    this.addGoalkeeper();
  }

  addEntryChannel(){
    const railThickness=16,clearWidth=104,centerX=330,top=270,bottom=410,centerSpacing=clearWidth+railThickness;
    const rails=[-1,1].map(side=>[[centerX+side*centerSpacing/2,top],[centerX+side*centerSpacing/2,bottom]]);
    const graphics=this.add.graphics().setDepth(5);
    graphics.lineStyle(16,C.navy,.96);for(const [[x0,y0],[x1,y1]] of rails){graphics.beginPath();graphics.moveTo(x0,y0);graphics.lineTo(x1,y1);graphics.strokePath();}
    graphics.lineStyle(7,C.cyan,.92);for(const [[x0,y0],[x1,y1]] of rails){graphics.beginPath();graphics.moveTo(x0,y0);graphics.lineTo(x1,y1);graphics.strokePath();}
    this.entryChannelBodies=rails.map(([[x0,y0],[x1,y1]])=>{const length=Math.hypot(x1-x0,y1-y0),angle=Math.atan2(y1-y0,x1-x0);return this.matter.add.rectangle((x0+x1)/2,(y0+y1)/2,length,16,{isStatic:true,angle,label:'entry-channel',friction:.002,restitution:.18,chamfer:{radius:7}});});
    this.entryChannel={angle:Math.PI/2,entranceCenterX:centerX,entranceY:top,exitCenterX:centerX,exitY:bottom,clearWidth,length:bottom-top};
  }

  drawLandscape(){
    const g=this.add.graphics().setDepth(1);
    g.fillGradientStyle(0x087bc1,0x087bc1,0x062f77,0x062f77,1);g.fillRect(0,920,480,160);
    g.fillGradientStyle(0x35b94a,0x35b94a,0x0c652f,0x0c652f,1);g.fillRect(480,920,1440,160);
    g.fillStyle(0x35b94a,1);g.fillTriangle(480,870,600,890,480,920);g.fillTriangle(480,920,600,890,600,920);g.fillTriangle(960,890,1920,850,960,920);g.fillTriangle(960,920,1920,850,1920,920);
    g.fillStyle(0x229fda,1);g.fillEllipse(780,890,360,220);
    g.fillStyle(0xf3d88b,.9);g.fillTriangle(440,1080,485,920,540,1080);
    g.lineStyle(5,0xb8f4ff,.55);for(let x=-20;x<500;x+=75){g.beginPath();g.arc(x,948,34,Math.PI,Math.PI*2);g.strokePath();}
    g.fillStyle(0x8be25e,.65);for(let x=500;x<1920;x+=18){if(x>600&&x<960)continue;const y=x<=600?870+(x-480)*20/120:890-(x-960)*40/960;const h=8+(x%5)*2;g.fillTriangle(x,y,x+6,y-h,x+11,y);}
    g.lineStyle(3,0xffffff,.08);for(let x=1000;x<1920;x+=90){g.beginPath();g.moveTo(x,950);g.lineTo(x-45,1080);g.strokePath();}
    for(let row=0;row<3;row++){const wave=this.add.graphics().setDepth(2);wave.lineStyle(4,0x9cecff,.24-row*.04);for(let x=-70;x<500;x+=95){wave.beginPath();wave.arc(x,975+row*30,42,Math.PI,Math.PI*2);wave.strokePath();}this.sceneryWaves.push({graphic:wave,phase:row*1.7,baseY:0});}
    // One continuous, non-flat drainage surface carries every grass landing into the shallow U.
    const bowlX=780,bowlY=890,bowlRadiusX=180,bowlRadiusY=110;
    for(const [width,color,alpha] of [[14,0x267f38,1],[3,0xa6ef83,.55]]){g.lineStyle(width,color,alpha);g.beginPath();for(let i=0;i<=24;i++){const a=Math.PI*i/24,x=bowlX+Math.cos(a)*bowlRadiusX,y=bowlY+Math.sin(a)*bowlRadiusY;i?g.lineTo(x,y):g.moveTo(x,y);}g.strokePath();}
    const terrainPoints=[[480,850],[540,865],[600,890],[660,925],[720,975],[760,997],[780,1000],[800,997],[840,980],[900,950],[960,925],[1080,905],[1320,875],[1560,845],[1800,815],[1920,800]];
    for(let i=0;i<terrainPoints.length-1;i++){const [x0,y0]=terrainPoints[i],[x1,y1]=terrainPoints[i+1],x=(x0+x1)/2,y=(y0+y1)/2,length=Math.hypot(x1-x0,y1-y0)*1.12,angle=Math.atan2(y1-y0,x1-x0);this.matter.add.rectangle(x,y,length,24,{isStatic:true,angle,label:'grass',friction:.0015,frictionStatic:.0004,restitution:.66,chamfer:{radius:7}});}
  }

  addPowerFan(x,y){
    const fan=this.add.container(x,y).setDepth(7);
    const bladeA=this.add.rectangle(0,0,310,36,C.cyan).setStrokeStyle(4,0xffffff,.72);
    const bladeB=this.add.rectangle(0,0,310,36,C.mint).setRotation(Math.PI/2).setStrokeStyle(4,0xffffff,.72);
    const hub=this.add.circle(0,0,34,C.navy).setStrokeStyle(7,C.white,.9);const core=this.add.circle(0,0,13,C.yellow);
    fan.add([bladeA,bladeB,hub,core]);
    const options={isStatic:true,label:'power-fan',friction:0,restitution:1.12,chamfer:{radius:10}};
    const bodies=[this.matter.add.rectangle(x,y,310,36,options),this.matter.add.rectangle(x,y,310,36,{...options,angle:Math.PI/2})];
    this.powerFan={x,y,angle:0,speed:.0065,bodies,visual:fan,lastTurn:0};
  }

  addRecoveryShooter(x,y){
    const visual=this.add.container(x,y).setDepth(7);
    const bladeA=this.add.rectangle(0,0,240,26,C.yellow).setStrokeStyle(3,0xffffff,.65);
    const bladeB=this.add.rectangle(0,0,240,26,C.cyan).setRotation(Math.PI/2).setStrokeStyle(3,0xffffff,.65);
    visual.add([bladeA,bladeB,this.add.circle(0,0,27,C.navy).setStrokeStyle(5,C.white,.82),this.add.circle(0,0,10,C.coral)]);
    const options={isStatic:true,label:'recovery-shooter',friction:0,restitution:.92,chamfer:{radius:8}};
    const bodies=[this.matter.add.rectangle(x,y,240,26,options),this.matter.add.rectangle(x,y,240,26,{...options,angle:Math.PI/2})];
    this.recoveryShooter={x,y,angle:0,speed:.0062,bodies,visual,lastTurn:0};
  }

  addGoalkeeper(){
    const x=1608,y=758;const container=this.add.container(x,y).setDepth(12);
    const arms=this.add.rectangle(0,4,92,20,C.cyan).setStrokeStyle(3,0xffffff,.7);const torso=this.add.rectangle(0,12,42,84,C.navy).setStrokeStyle(4,C.cyan,.9);const head=this.add.circle(0,-49,22,C.white).setStrokeStyle(4,C.navy,1);const visor=this.add.rectangle(0,-50,25,8,C.coral);const badge=this.add.circle(0,6,8,C.yellow);
    container.add([arms,torso,head,visor,badge]);
    const body=this.matter.add.rectangle(x,y,94,116,{isStatic:true,label:'goalkeeper',friction:.001,restitution:1.02,chamfer:{radius:10}});
    this.goalkeeper={x,centerY:y,range:115,speed:.0072,body,container};
  }

  updatePowerFan(time,delta){
    const f=this.powerFan;if(!f)return;f.angle+=f.speed*delta;
    this.matter.body.setAngle(f.bodies[0],f.angle,true);this.matter.body.setAngle(f.bodies[1],f.angle+Math.PI/2,true);f.visual.setRotation(f.angle);
    const turns=Math.floor(f.angle/(Math.PI*2));if(turns>f.lastTurn){this.telemetry.launcherShots+=turns-f.lastTurn;f.lastTurn=turns;}
  }

  updateRecoveryShooter(delta){
    const s=this.recoveryShooter;if(!s)return;s.angle+=s.speed*delta;
    this.matter.body.setAngle(s.bodies[0],s.angle,true);this.matter.body.setAngle(s.bodies[1],s.angle+Math.PI/2,true);s.visual.setRotation(s.angle);
    const turns=Math.floor(s.angle/(Math.PI*2));if(turns>s.lastTurn){this.telemetry.recoveryTurns+=turns-s.lastTurn;s.lastTurn=turns;}
  }

  updateGoalkeeper(time){
    if(!this.goalkeeper)return;const k=this.goalkeeper,y=k.centerY+Math.sin(time*k.speed)*k.range;
    this.matter.body.setPosition(k.body,{x:k.x,y},true);k.container.setPosition(k.x,y);
  }

  updateScenery(time){this.sceneryWaves.forEach((w,i)=>{w.graphic.x=Math.sin(time*.00075+w.phase)*12;w.graphic.y=Math.sin(time*.0011+w.phase)*3;});}

  drawGoal(){
    const g=this.add.graphics().setDepth(4);const line=1660,back=1912,top=594,bottom=922,frame=8;
    g.fillStyle(0xffffff,.96);g.fillRoundedRect(line,top,frame,bottom-top,4);g.fillRoundedRect(back-frame,top,frame,bottom-top,4);
    g.fillRoundedRect(line,top,back-line,frame,4);g.fillRoundedRect(line,bottom-frame,back-line,frame,4);
    g.lineStyle(3,0xffffff,.52);
    for(let x=line+24;x<back;x+=24){g.beginPath();g.moveTo(x,top+frame);g.lineTo(x,bottom);g.strokePath();}
    for(let y=top+30;y<bottom;y+=30){g.beginPath();g.moveTo(line+frame,y);g.lineTo(back,y);g.strokePath();}
    g.lineStyle(2,0x69ddff,.8);g.beginPath();g.moveTo(line,top);g.lineTo(line,bottom);g.strokePath();
  }

  createSensors(){
    // Dedicated goal-line sensor spans the legal opening; continuous crossing logic prevents tunnelling.
    this.goalSensor=this.matter.add.rectangle(1730,758,82,270,{isStatic:true,isSensor:true,label:'goal-line'});
    this.goalOutSensors=[this.matter.add.rectangle(1900,400,40,388,{isStatic:true,isSensor:true,label:'goal-out'}),this.matter.add.rectangle(1950,758,72,328,{isStatic:true,isSensor:true,label:'goal-out'})];
    // A marble is out only after its full diameter has sunk below the sea surface.
    this.killSensors=[this.matter.add.rectangle(240,1029,480,102,{isStatic:true,isSensor:true,label:'sea'})];
  }

  buildBroadcastUI(){
    const panel=this.add.graphics().setDepth(30); panel.fillStyle(0x03132e,.94);panel.fillRoundedRect(42,24,1836,174,25);panel.lineStyle(3,0x49dfff,.38);panel.strokeRoundedRect(42,24,1836,174,25);
    panel.fillGradientStyle(0x156bdb,0x156bdb,0x082b70,0x082b70,1);panel.fillRoundedRect(65,45,405,132,18);
    this.tournamentTitle=this.add.text(267,77,this.tournamentConfig.tournamentTitle,{fontFamily:'Barlow Condensed',fontSize:35,fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(31);
    this.phaseTitle=this.add.text(267,127,'',{fontFamily:'Barlow Condensed',fontSize:25,fontStyle:'bold',color:'#6ee8ff',letterSpacing:5}).setOrigin(.5).setDepth(31);
    this.scoreSlots=[];this.scoreUI={};
    for(let i=0;i<4;i++){
      const x=495+i*338,bg=this.add.graphics().setDepth(30);bg.fillStyle(0x0c2855,1);bg.fillRoundedRect(x,45,315,132,17);
      const stripe=this.add.rectangle(x+4.5,111,9,132,0xffffff).setDepth(31);const marble=this.add.image(x+50,83,'flag-FR').setDisplaySize(66,44).setDepth(31);
      const name=this.add.text(x+89,62,'',{fontFamily:'Barlow Condensed',fontSize:25,fontStyle:'bold',color:'#dcefff'}).setDepth(31);
      const score=this.add.text(x+250,111,'0',{fontFamily:'Barlow Condensed',fontSize:60,fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(31);
      const status=this.add.text(x+88,121,'RACING',{fontFamily:'Inter',fontSize:15,fontStyle:'bold',color:'#65ddff',letterSpacing:2}).setDepth(31);
      this.scoreSlots.push({bg,stripe,marble,name,score,status,elements:[bg,stripe,marble,name,score,status]});
    }
    this.goalFlashFlag=this.add.image(W/2-150,260,'flag-FR').setDisplaySize(105,70).setDepth(40).setAlpha(0).setScale(.4);
    this.goalFlash=this.add.text(W/2+30,260,'GOAL!',{fontFamily:'Barlow Condensed',fontSize:92,fontStyle:'bold',color:'#fff',stroke:'#ff386b',strokeThickness:12}).setOrigin(.5).setDepth(40).setAlpha(0).setScale(.4);
    this.updateMatchUI();
  }

  updateMatchUI(){
    this.phaseTitle.setText(getMatchHeaderLabel(this.tournament.stage,this.currentMatch?.group,this.tournamentConfig.teamCount));this.scoreUI={};
    this.scoreSlots.forEach((slot,i)=>{const team=this.currentTeams[i],visible=!!team;slot.elements.forEach(e=>e.setVisible(visible));if(!team)return;slot.stripe.setFillStyle(Phaser.Display.Color.HexStringToColor(team.colors[0]).color);slot.marble.setTexture(`flag-${team.countryCode}`).setDisplaySize(66,44);slot.name.setText(team.name);slot.score.setText('0');slot.status.setText('RACING').setColor('#65ddff');this.scoreUI[team.id]={score:slot.score,status:slot.status,panelX:495+i*338};});
  }

  releaseSpawn(teamId,slot=0){
    if(!this.state.isActive(teamId)||this.teamCounts[teamId]>=this.currentMatch.activeMarblesPerTeam)return;
    const team=this.currentTeams.find(t=>t.id===teamId),channel=this.entryChannel,laneOffset=slot===0?-27:slot===1?27:0,x=channel.entranceCenterX+laneOffset+Phaser.Math.Between(-2,2),y=channel.entranceY+38+Phaser.Math.Between(-2,2);
    const ball=this.matter.add.image(x,y,`marble-${teamId}`,null,{shape:{type:'circle',radius:CFG.marble.radius},restitution:CFG.marble.restitution,friction:CFG.marble.friction,frictionStatic:CFG.marble.frictionStatic,frictionAir:CFG.marble.frictionAir,density:CFG.marble.density,label:`marble:${teamId}`}).setDisplaySize(58,58).setDepth(10);
    const assistance=constraintAssistance(this.tournamentConfig,this.currentMatch,this.state,teamId);ball.setVelocity(assistance*(1.2+Math.random()*.8),0);ball.setAngularVelocity((Math.random()-.5)*.18);ball.teamId=teamId;ball.resolved=false;
    ball.flow={anchorX:x,anchorY:y,stationarySince:this.time.now,previousX:x,previousY:y,fanContact:false,firstPassClassified:false,meaningfulInteraction:false,zoneSince:null};
    this.marbles.set(ball.body.id,ball);this.teamCounts[teamId]++;this.telemetry.spawned++;
  }

  queueSpawn(teamId){
    if(this.matchPaused||!this.state.isActive(teamId)||this.teamCounts[teamId]+this.pendingSpawns[teamId]>=this.currentMatch.activeMarblesPerTeam)return;
    this.pendingSpawns[teamId]++;this.entryQueue.push({teamId,queuedAt:this.time.now});this.telemetry.maxEntryQueue=Math.max(this.telemetry.maxEntryQueue,this.entryQueue.length);
  }

  releaseEntryBatch(time){
    if(!this.entryQueue.length||time-this.lastEntryRelease<this.entryBatchInterval)return;const batch=[];
    while(batch.length<this.entryBatchSize&&this.entryQueue.length){let index=this.entryQueue.findIndex(item=>item.teamId!==this.lastEntryTeam&&!batch.some(entry=>entry.teamId===item.teamId));if(index<0)index=this.entryQueue.findIndex(item=>item.teamId!==this.lastEntryTeam);if(index<0)index=0;const item=this.entryQueue.splice(index,1)[0];batch.push(item);this.lastEntryTeam=item.teamId;}
    this.telemetry.maxEntryBatch=Math.max(this.telemetry.maxEntryBatch,batch.length);this.entryReleaseHistory.push({time:Math.round(time),teams:batch.map(item=>item.teamId)});this.entryReleaseHistory=this.entryReleaseHistory.slice(-20);
    batch.forEach((item,slot)=>{this.pendingSpawns[item.teamId]=Math.max(0,this.pendingSpawns[item.teamId]-1);if(!this.state.isActive(item.teamId))return;this.telemetry.entryReleased++;this.telemetry.entryQueueWaitTotal+=Math.max(0,time-item.queuedAt);this.releaseSpawn(item.teamId,slot);});this.lastEntryRelease=time;
  }

  onCollision(event){
    for(const pair of event.pairs){
      const marbleBody=[pair.bodyA,pair.bodyB].find(b=>b.label?.startsWith('marble:'));
      const obstacle=[pair.bodyA,pair.bodyB].find(b=>b.label==='power-fan'||b.label==='recovery-shooter'||b.label==='goalkeeper');
      if(marbleBody&&obstacle){const marble=this.marbles.get(marbleBody.id);if(marble?.flow)marble.flow.meaningfulInteraction=true;if(obstacle.label==='power-fan'){this.telemetry.launcherHits++;if(marble?.flow&&!marble.flow.firstPassClassified&&!marble.flow.fanContact){marble.flow.fanContact=true;this.telemetry.firstPassFanContacts++;}const assistance=marble?constraintAssistance(this.tournamentConfig,this.currentMatch,this.state,marble.teamId):0;if(assistance&&marble?.body)marble.setVelocity(marble.body.velocity.x+assistance*(3.2+Math.random()*1.6),marble.body.velocity.y+(Math.random()-.5)*assistance*2.4);mediaRuntime.event('power-fan');}else if(obstacle.label==='recovery-shooter')this.telemetry.recoveryHits++;else {this.telemetry.goalkeeperSaves++;mediaRuntime.event('goalkeeper-save');}}
      if(pair.bodyA.label?.startsWith('marble:')&&pair.bodyB.label?.startsWith('marble:'))mediaRuntime.event('marble-impact');
      const grass=[pair.bodyA,pair.bodyB].find(b=>b.label==='grass');if(marbleBody&&grass){this.telemetry.grassContacts++;const marble=this.marbles.get(marbleBody.id);if(marble?.flow)marble.flow.meaningfulInteraction=true;}
      const sensor=[pair.bodyA,pair.bodyB].find(b=>b.label==='goal-line'||b.label==='sea'||b.label==='goal-out');
      if(!marbleBody||!sensor)continue; const marble=this.marbles.get(marbleBody.id); if(!marble||marble.resolved)continue;
      if(sensor.label==='goal-line')this.tryResolveGoal(marble);else if(sensor.label==='sea'){this.telemetry.seaEliminations++;if(!marble.flow.meaningfulInteraction)this.telemetry.directSpawnToSea++;this.resolveMarble(marble,false);}else this.time.delayedCall(0,()=>{if(!marble.resolved&&!this.tryResolveGoal(marble))this.resolveMarble(marble,false);});
    }
  }

  tryResolveGoal(marble){if(!marble||marble.resolved||!marble.body)return false;const previous={x:marble.flow.previousX,y:marble.flow.previousY},current={x:marble.x,y:marble.y};if(!legalGoalCrossing(previous,current,CFG.marble.radius,GOAL_GEOMETRY))return false;marble.flow.meaningfulInteraction=true;this.resolveMarble(marble,true);return true;}

  resolveMarble(marble,scored){
    if(!marble||marble.resolved)return; marble.resolved=true; const teamId=marble.teamId; this.marbles.delete(marble.body.id);this.teamCounts[teamId]=Math.max(0,this.teamCounts[teamId]-1);
    marble.destroy();
    if(scored){
      const result=this.state.score(teamId); if(result.accepted){this.telemetry.goals++;this.telemetry.totalGoals++;this.scoreUI[teamId].score.setText(this.state.scores[teamId]);this.showGoal(teamId);mediaRuntime.event('goal');}
      for(const qualifiedId of result.newlyQualified??(result.qualified?[teamId]:[])){const place=this.state.qualified.indexOf(qualifiedId)+1;this.scoreUI[qualifiedId].status.setText(this.currentMatch.type==='group'?`${place===1?'1ST':'2ND'} • QUALIFIED`:'WINNER').setColor('#62ffad');this.removeTeam(qualifiedId);mediaRuntime.event(this.currentMatch.type==='group'?'qualification':'knockout-victory');}
      if(result.finished){this.time.delayedCall(900,()=>this.finishCurrentMatch());return;}
    } else this.telemetry.eliminations++;
    if(this.state.isActive(teamId))this.scheduleSpawn(teamId);
  }

  scheduleSpawn(teamId,delay=null){
    if(this.matchPaused||!this.state.isActive(teamId)||this.teamCounts[teamId]+this.pendingSpawns[teamId]>=this.currentMatch.activeMarblesPerTeam)return;
    const recoveryFactor=1-Math.max(-.5,this.teamPerformance(teamId))*.1;const d=delay??Math.round(Phaser.Math.Between(CFG.respawnDelayMs.min,CFG.respawnDelayMs.max)*recoveryFactor);this.pendingSpawns[teamId]++;
    this.respawnQueue.push({teamId,due:this.time.now+d});
  }

  removeTeam(teamId){
    [...this.marbles.values()].filter(m=>m.teamId===teamId).forEach(m=>{m.resolved=true;this.marbles.delete(m.body.id);m.destroy();});this.teamCounts[teamId]=0;
    this.entryQueue=this.entryQueue.filter(item=>item.teamId!==teamId);this.respawnQueue=this.respawnQueue.filter(item=>item.teamId!==teamId);this.pendingSpawns[teamId]=0;
  }

  showGoal(teamId){const team=this.currentTeams.find(t=>t.id===teamId);this.goalFlashFlag.setTexture(`flag-${team.countryCode}`).setAlpha(1).setScale(.45);this.goalFlash.setText('GOAL!').setAlpha(1).setScale(.45);this.tweens.add({targets:[this.goalFlashFlag,this.goalFlash],scale:1,alpha:{from:1,to:0},duration:1050,ease:'Back.Out'});this.cameras.main.shake(160,.005);}

  clearMatchMarbles(){[...this.marbles.values()].forEach(m=>{m.resolved=true;m.destroy();});this.marbles.clear();this.respawnQueue=[];this.entryQueue=[];this.pendingSpawns=Object.fromEntries(this.currentTeams.map(t=>[t.id,0]));this.teamCounts=Object.fromEntries(this.currentTeams.map(t=>[t.id,0]));}

  finishCurrentMatch(){
    if(this.matchPaused)return;this.matchPaused=true;const completed=this.currentMatch,result=this.state.result();assertConstraintResult(this.tournamentConfig,completed,result);this.telemetry.matchDurations.push({match:completed.id,durationMs:Math.round(this.time.now-this.matchStart)});this.clearMatchMarbles();const next=this.tournament.completeMatch(result);
    const continueFlow=()=>{if(!next){this.showChampion();return;}this.resetForMatch(next);const start=()=>this.startCurrentMatch();if(next.type==='group')this.presentation.showGroupIntro(next,start);else if(next.stage!==completed.stage&&next.stage!=='final'){mediaRuntime.note(`${getStageDisplayName(next.stage,this.tournamentConfig.teamCount)} BRACKET`);this.presentation.showBracket(()=>this.presentation.showMatchup(next,start));}else{if(next.stage==='final'&&next.stage!==completed.stage)mediaRuntime.note('FINAL INTRO');this.presentation.showMatchup(next,start);}};
    if(completed.type==='group')this.presentation.showGroupResult(completed,result,continueFlow);else this.presentation.showKnockoutResult(completed,result,continueFlow);
  }

  resetForMatch(match){
    this.currentMatch=match;this.currentTeams=match.teams;this.state=new MatchController(match);this.teamCounts=Object.fromEntries(this.currentTeams.map(t=>[t.id,0]));this.pendingSpawns=Object.fromEntries(this.currentTeams.map(t=>[t.id,0]));this.respawnQueue=[];this.entryQueue=[];this.lastEntryRelease=-Infinity;this.lastEntryTeam=null;this.entryReleaseHistory=[];this.matchStart=this.time.now;this.telemetry.goals=0;this.updateMatchUI();
    const fan=this.powerFan;fan.angle=0;fan.lastTurn=0;this.matter.body.setAngle(fan.bodies[0],0);this.matter.body.setAngle(fan.bodies[1],Math.PI/2);fan.visual.setRotation(0);
    const recovery=this.recoveryShooter;recovery.angle=0;recovery.lastTurn=0;this.matter.body.setAngle(recovery.bodies[0],0);this.matter.body.setAngle(recovery.bodies[1],Math.PI/2);recovery.visual.setRotation(0);
    this.matter.body.setPosition(this.goalkeeper.body,{x:this.goalkeeper.x,y:this.goalkeeper.centerY});this.goalkeeper.container.setPosition(this.goalkeeper.x,this.goalkeeper.centerY);this.matchPaused=true;
  }

  startCurrentMatch(){this.matchPaused=false;mediaRuntime.note(this.currentMatch.id.toUpperCase());mediaRuntime.setPhase(getStageDisplayName(this.tournament.stage,this.tournamentConfig.teamCount));mediaRuntime.event('match-start');for(let i=0;i<this.currentMatch.activeMarblesPerTeam;i++)this.currentTeams.forEach(team=>this.queueSpawn(team.id));}

  showChampion(){const champion=TEAMS.find(t=>t.id===this.tournament.champion);mediaRuntime.note('CHAMPION');this.presentation.showChampion(champion);mediaRuntime.setPhase(getStageDisplayName('complete',this.tournamentConfig.teamCount));mediaRuntime.markChampionPresented();mediaRuntime.event('champion');if(mediaRuntime.recording)this.time.delayedCall(6500,()=>{mediaRuntime.note('END CARD');this.presentation.showEndCard(()=>{mediaRuntime.markEndCardFinished();mediaRuntime.finish(this.tournament.stage);});});else if(APP_MODE==='online')this.time.delayedCall(2500,()=>{if(document.querySelector('[data-new-tournament]'))return;const button=document.createElement('button');button.type='button';button.dataset.newTournament='';button.className='new-tournament';button.textContent='NEW TOURNAMENT';button.onclick=()=>location.reload();document.querySelector('#game-shell')?.appendChild(button);button.focus({preventScroll:true});});}

  teamPerformance(teamId){
    const cfg=this.tournamentConfig,base=cfg.teamStrengthEnabled?((cfg.teamStrengths[teamId]??50)-50)/50:0;
    return Phaser.Math.Clamp(base*.45+constraintAssistance(cfg,this.currentMatch,this.state,teamId),-.45,1);
  }

  update(time,delta){
    if(mediaRuntime.recording){const performance=this.recordingPerformance,now=Date.now();if(!performance.startedAt)performance.startedAt=now;const elapsed=now-performance.startedAt,fps=Math.min(60,1000/Math.max(1,delta));performance.total+=fps;performance.count++;performance.minimum=Math.min(performance.minimum,fps);if(elapsed<=5000){performance.first5Total+=fps;performance.first5Count++;}if(elapsed<=15000){performance.first15Total+=fps;performance.first15Count++;}}
    if(this.matchPaused){this.updateScenery(time);return;}
    this.updatePowerFan(time,delta);
    this.updateRecoveryShooter(delta);
    this.updateGoalkeeper(time);
    this.updateScenery(time);
    for(let index=this.respawnQueue.length-1;index>=0;index--){const item=this.respawnQueue[index];if(item.due>time)continue;this.respawnQueue.splice(index,1);this.entryQueue.push({teamId:item.teamId,queuedAt:time});this.telemetry.maxEntryQueue=Math.max(this.telemetry.maxEntryQueue,this.entryQueue.length);}
    this.releaseEntryBatch(time);
    const fps=Math.min(60,1000/Math.max(1,delta));this.telemetry.frameSamples++;this.telemetry.averageFps+=((fps-this.telemetry.averageFps)/this.telemetry.frameSamples);this.telemetry.minimumFps=Math.min(this.telemetry.minimumFps,fps);
    let orbitOccupancy=0;
    [...this.marbles.values()].forEach(m=>{
      if(!m?.body||m.resolved){for(const [bodyId,tracked] of this.marbles)if(tracked===m)this.marbles.delete(bodyId);return;}
      if(m.x>260&&m.x<750&&m.y>390&&m.y<650)orbitOccupancy++;if(m.x>500)m.flow.meaningfulInteraction=true;
      this.telemetry.maxMarbleSpeed=Math.max(this.telemetry.maxMarbleSpeed,Math.round(Math.hypot(m.body.velocity.x,m.body.velocity.y)*10)/10);
      if(!m.flow.missCounted&&m.x>W+35){if(m.y<594)this.telemetry.missesAbove++;m.flow.missCounted=true;}
      if(this.tryResolveGoal(m))return;this.checkStationary(m,time);if(m.resolved)return;
      if(!m.flow.firstPassClassified&&m.y>=790){m.flow.firstPassClassified=true;if(!m.flow.fanContact)this.telemetry.firstPassGapFalls++;}
      m.flow.previousX=m.x;m.flow.previousY=m.y;
      if(m.y>CFG.arena.killY||m.x<-80||m.x>W+80)this.resolveMarble(m,false);
    });
    this.telemetry.maxOrbitOccupancy=Math.max(this.telemetry.maxOrbitOccupancy,orbitOccupancy);
    if(time-this.lastTelemetryUpdate>1000){this.currentTeams.forEach(t=>this.scheduleSpawn(t.id));this.telemetryElement.textContent=JSON.stringify(this.debugSnapshot());this.lastTelemetryUpdate=time;}
  }

  checkStationary(marble,time){
    const flow=marble.flow;if(!flow)return;const speed=Math.hypot(marble.body.velocity.x,marble.body.velocity.y),distance=Phaser.Math.Distance.Between(marble.x,marble.y,flow.anchorX,flow.anchorY),temporary=Phaser.Math.Distance.Between(marble.x,marble.y,this.powerFan.x,this.powerFan.y)<185||Phaser.Math.Distance.Between(marble.x,marble.y,this.recoveryShooter.x,this.recoveryShooter.y)<135;
    if(speed>.22||distance>8){flow.anchorX=marble.x;flow.anchorY=marble.y;flow.stationarySince=time;flow.zoneSince=null;return;}if(temporary){flow.zoneSince??=time;if(time-flow.zoneSince<1800)return;}if(time-flow.stationarySince<3000)return;
    const onGrass=marble.x>=480&&marble.y>=790;if(onGrass){const dx=this.recoveryShooter.x-marble.x,direction=Math.sign(dx)||1,forceX=Math.max(.00035,Math.min(.00085,Math.abs(dx)*.0000015))*direction;marble.applyForce({x:forceX,y:-.0003});marble.setAngularVelocity(direction*.05);this.telemetry.nudges++;this.telemetry.grassRecoveries++;flow.anchorX=marble.x;flow.anchorY=marble.y;flow.stationarySince=time;return;}
    this.telemetry.stuckResets++;this.telemetry.stuckLocations.push({x:Math.round(marble.x),y:Math.round(marble.y)});this.telemetry.stuckLocations=this.telemetry.stuckLocations.slice(-12);this.resolveMarble(marble,false);
  }

  debugSnapshot(){
    const marbles=[...this.marbles.values()].filter(m=>m?.body&&!m.resolved).map(m=>({team:m.teamId,x:Math.round(m.x),y:Math.round(m.y),stationaryMs:Math.round(this.time.now-m.flow.stationarySince)}));
    const channelBodies=(this.entryChannelBodies??[]).map(body=>({x:body.position.x,y:body.position.y,angle:body.angle,width:body.bounds.max.x-body.bounds.min.x,height:body.bounds.max.y-body.bounds.min.y}));
    const p=this.recordingPerformance,recordingPerformance={first5AverageFps:p.first5Count?p.first5Total/p.first5Count:0,first15AverageFps:p.first15Count?p.first15Total/p.first15Count:0,averageFps:p.count?p.total/p.count:0,minimumFps:p.count?p.minimum:0,samples:p.count};
    return {elapsedMs:Math.round(this.time.now-this.matchStart),match:{id:this.currentMatch.id,type:this.currentMatch.type,label:this.currentMatch.label,activeMarblesPerTeam:this.currentMatch.activeMarblesPerTeam},scores:{...this.state.scores},qualified:[...this.state.qualified],winner:this.state.winner,finished:this.state.finished,active:{...this.teamCounts},entryChannel:{...this.entryChannel,bodies:channelBodies},entryQueue:{length:this.entryQueue.length,averageWaitMs:this.telemetry.entryReleased?Math.round(this.telemetry.entryQueueWaitTotal/this.telemetry.entryReleased):0,releases:[...this.entryReleaseHistory]},recording:{...mediaRuntime.debugSnapshot(),performance:recordingPerformance},tournament:this.tournament.snapshot(),telemetry:{...this.telemetry},marbles};
  }
}

const deviceMode=detectDeviceMode(window,APP_MODE);document.documentElement.dataset.runtimeMode=deviceMode.mode;
const tournamentConfig=await showTournamentSetup();
await showRuntimeLaunch(deviceMode,(settings,record)=>mediaRuntime.prepare(settings,record));
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0d74c9',
  physics: { default: 'matter', matter: { gravity: { y: CFG.gravity }, enableSleep: false, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // Recording captures at 30fps, so render and physics on that same fixed cadence instead of
  // spending CPU on frames that the encoder will discard. Normal play remains 60fps.
  fps: {target:60},
  render: { antialias: true, roundPixels: false },
  scene: [new MarbleFootballScene(tournamentConfig)]
});
