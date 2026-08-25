export function detectDeviceMode(environment=globalThis,deploymentMode='auto'){
  const media=query=>environment.matchMedia?.(query).matches??false,viewportWidth=environment.innerWidth??0,finePointer=media('(pointer: fine)'),coarsePointer=media('(pointer: coarse)'),touchPoints=environment.navigator?.maxTouchPoints??0,hasRecorder=typeof environment.MediaRecorder==='function',hasCapture=typeof environment.HTMLCanvasElement!=='undefined'&&typeof environment.HTMLCanvasElement.prototype.captureStream==='function';
  if(deploymentMode==='online')return {mode:'online',online:true,creator:false,watch:false,viewportWidth,finePointer,coarsePointer,touchPoints,recordingSupported:false};
  const creator=viewportWidth>=1024&&finePointer&&hasRecorder&&hasCapture;
  return {mode:creator?'creator':'watch',online:false,creator,watch:!creator,viewportWidth,finePointer,coarsePointer,touchPoints,recordingSupported:hasRecorder&&hasCapture};
}
