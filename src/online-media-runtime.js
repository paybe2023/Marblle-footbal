import { AudioMixer,loadAudioManifest } from './audio-mixer.js';

class OnlineMediaRuntime{
  constructor(){this.audio=new AudioMixer();this.recording=false;this.phase='SETUP';this.timeline=[];}
  async prepare(settings={music:false,crowd:false,sfx:true}){this.audio.initialize(settings);await this.audio.configure(await loadAudioManifest());}
  async attachStage(){return null;}
  event(name){this.audio.event(name);if(name==='champion')setTimeout(()=>this.audio.stopMusic(),6500);}
  setPhase(phase){this.phase=phase;this.audio.setStage(phase);}
  note(label){this.timeline.push({label,elapsedMs:0});}
  debugSnapshot(){return{requested:false,recording:false,recorder:null,timeline:[...this.timeline],mode:'online'};}
  markChampionPresented(){}
  markEndCardFinished(){}
  async finish(){this.audio.stopMusic();return null;}
}

export const mediaRuntime=new OnlineMediaRuntime();
