export function showRuntimeLaunch(deviceMode,onLaunch){
  const shell=document.querySelector('#game-shell'),root=document.createElement('div');root.className='runtime-launch';shell.appendChild(root);
  root.innerHTML=`<div class="runtime-card online"><small>ONLINE MODE</small><h2>TOURNAMENT READY</h2><p>Your complete interactive tournament is configured and ready.</p><label class="fullscreen-choice"><input id="fullscreen" type="checkbox" checked> Use fullscreen when supported</label><button id="online-start" type="button">START TOURNAMENT</button></div>`;
  const start=root.querySelector('#online-start');start.focus({preventScroll:true});
  return new Promise(resolve=>start.onclick=async()=>{const fullscreen=root.querySelector('#fullscreen').checked&&document.fullscreenEnabled?shell.requestFullscreen().catch(()=>{}):Promise.resolve();await onLaunch({music:false,crowd:false,sfx:true},false);await fullscreen;root.remove();resolve({record:false});});
}
