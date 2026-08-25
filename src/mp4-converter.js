import { sanitizeVideoFilename,verifyRecordedContainer } from './recording-controller.js';

export const MP4_ENCODING=Object.freeze({videoCodec:'H.264/libx264',audioCodec:'AAC-LC',width:1920,height:1080,fps:30,pixelFormat:'yuv420p',crf:22,preset:'veryfast',audioBitrate:'160k',importedMusicAudioBitrate:'192k',audioSampleRate:48000,audioChannels:2,faststart:true});
export const FFMPEG_ASSETS=Object.freeze({architecture:'local-server-native-ffmpeg',endpoint:new URL(`${import.meta.env.BASE_URL}api/mp4/`,location.href).href,requiresSharedArrayBuffer:false,usesWasm:false,usesCdn:false});
const WATCHDOG_MS=30_000,POLL_MS=500;

export class ConverterTimeoutError extends Error{constructor(stage){super(`MP4 converter did not respond during ${stage} for ${WATCHDOG_MS/1000} seconds.`);this.name='ConverterTimeoutError';this.code='CONVERTER_TIMEOUT';this.stage=stage;}}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const diagnostic=(step,state,message,details,onState)=>{console.info(`[MP4 ${step}/11] ${message}`,details);onState({step,state,message,details});};
const fetchWithTimeout=async(url,options,stage)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),WATCHDOG_MS);try{const response=await fetch(url,{...options,signal:controller.signal});if(!response.ok){let detail;try{detail=(await response.json()).error;}catch{}throw new Error(detail||`${stage} failed with HTTP ${response.status}.`);}return response;}catch(error){if(error.name==='AbortError')throw new ConverterTimeoutError(stage);throw error;}finally{clearTimeout(timer);}};
const upload=({source,url,label='media',headers={},onUploadProgress=()=>{}})=>new Promise((resolve,reject)=>{const request=new XMLHttpRequest();let timer;const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>{request.abort();reject(new ConverterTimeoutError(`${label} upload`));},WATCHDOG_MS);};request.open('POST',url);request.setRequestHeader('Content-Type',source.type||'application/octet-stream');for(const [name,value] of Object.entries(headers))request.setRequestHeader(name,value);request.upload.onloadstart=arm;request.upload.onprogress=event=>{arm();if(event.lengthComputable)onUploadProgress(event.loaded/event.total*100);};request.onerror=()=>{clearTimeout(timer);reject(new Error(`Could not upload ${label} to the local MP4 converter.`));};request.onload=()=>{clearTimeout(timer);let data;try{data=JSON.parse(request.responseText);}catch{data={};}request.status>=200&&request.status<300?resolve(data):reject(new Error(data.error||`Local converter ${label} upload failed with HTTP ${request.status}.`));};arm();request.send(source);});

export async function convertWebMToMp4(source,{title='Tournament',durationMs=0,music=null,onProgress=()=>{},onState=()=>{}}={}){
  if(!await verifyRecordedContainer(source,'webm'))throw new Error('The WebM recovery source is invalid.');
  const base=FFMPEG_ASSETS.endpoint;
  diagnostic(3,'loading-module','Loading local FFmpeg conversion module.',FFMPEG_ASSETS,onState);
  diagnostic(5,'loading-core','Checking native FFmpeg core on localhost.',{url:`${base}health`},onState);
  const health=await (await fetchWithTimeout(`${base}health`,{},'native FFmpeg health check')).json();
  diagnostic(5,'loading-wasm','Browser WASM bypassed; native FFmpeg requires no WASM or SharedArrayBuffer.',health,onState);
  diagnostic(5,'starting-worker','Starting native FFmpeg conversion job.',{bytes:source.size},onState);
  const created=await upload({source,url:`${base}jobs`,label:'preserved WebM',headers:{'X-Music-Attached':music?.blob?'1':'0'},onUploadProgress:value=>onState({step:7,state:'uploading',message:`Uploading preserved WebM ${Math.round(value)}%.`,details:{progress:value}})});
  if(music?.blob){const requestedVolume=Number(music.volume),volume=Number.isFinite(requestedVolume)?Math.max(0,Math.min(1,requestedVolume)):.3;diagnostic(7,'uploading-music','Uploading local music for deterministic MP4 mixing.',{filename:music.filename,bytes:music.blob.size,volume},onState);await upload({source:music.blob,url:`${base}jobs/${created.jobId}/music`,label:'music',headers:{'X-Music-Name':encodeURIComponent(music.filename||'music'),'X-Music-Volume':String(volume)},onUploadProgress:value=>onState({step:7,state:'uploading-music',message:`Uploading local music ${Math.round(value)}%.`,details:{progress:value}})});}
  diagnostic(6,'ready','Native FFmpeg job accepted and ready.',created,onState);
  let lastChange=Date.now(),lastSignature='';
  while(true){
    const status=await (await fetchWithTimeout(`${base}jobs/${created.jobId}`,{},'native FFmpeg status check')).json(),signature=`${status.state}:${status.progress}:${status.updatedAt}`;
    if(signature!==lastSignature){lastSignature=signature;lastChange=Date.now();}
    if(Date.now()-lastChange>WATCHDOG_MS)throw new ConverterTimeoutError(`native FFmpeg ${status.state}`);
    if(status.state==='probing')diagnostic(7,'writing-input',status.message,status,onState);
    else if(status.state==='ready')diagnostic(8,'ready',status.message,status,onState);
    else if(status.state==='converting'){onState({step:8,state:'converting',message:status.message,details:status});onProgress(status.progress||0);}
    else if(status.state==='validating')diagnostic(10,'validating',status.message,status,onState);
    else if(status.state==='failed')throw new Error(status.error||'Native FFmpeg conversion failed.');
    else if(status.state==='complete'){
      onProgress(100);diagnostic(10,'output-created','Native MP4 output created.',{bytes:status.outputBytes},onState);const blob=await (await fetchWithTimeout(`${base}jobs/${created.jobId}/file`,{},'MP4 download')).blob();if(!await verifyRecordedContainer(blob,'mp4'))throw new Error('Local FFmpeg did not return a valid MP4 container.');diagnostic(11,'validated','MP4 validation complete.',status.probe,onState);return{blob,filename:sanitizeVideoFilename(title,undefined,'mp4'),format:{mimeType:'video/mp4',container:'mp4'},encoding:MP4_ENCODING,durationMs,sourceWebM:source,probe:JSON.stringify(status.probe)};
    }
    await delay(POLL_MS);
  }
}
