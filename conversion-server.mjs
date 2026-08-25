import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdtemp, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const ffmpegPath=ffmpegInstaller.path,ffprobePath=ffprobeInstaller.path,jobs=new Map(),MAX_INPUT_BYTES=1024*1024*1024;
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const run=(command,args)=>new Promise((resolve,reject)=>{const child=spawn(command,args,{windowsHide:true}),stdout=[],stderr=[];child.stdout.on('data',data=>stdout.push(data));child.stderr.on('data',data=>stderr.push(data));child.once('error',reject);child.once('close',code=>code===0?resolve({stdout:Buffer.concat(stdout).toString(),stderr:Buffer.concat(stderr).toString()}):reject(new Error(`${command} exited with code ${code}: ${Buffer.concat(stderr).toString().slice(-2000)}`)));});
const probe=async file=>JSON.parse((await run(ffprobePath,['-v','error','-show_entries','format=format_name,duration:stream=codec_name,codec_type,profile,width,height,pix_fmt,r_frame_rate,duration,sample_rate,channels,channel_layout,sample_fmt','-of','json',file])).stdout);
const videoDurationOf=info=>{const video=info?.streams?.find(stream=>stream.codec_type==='video');return Math.max(0,Number(video?.duration)||Number(info?.format?.duration)||0);};
const normalizedAudio='aresample=48000:async=1:first_pts=0,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';

async function convert(job){
  try{
    job.state='probing';job.message='Inspecting preserved WebM recording.';const sourceProbe=await probe(job.input),duration=videoDurationOf(sourceProbe),sourceHasAudio=sourceProbe.streams?.some(stream=>stream.codec_type==='audio');if(!duration)throw new Error('Could not determine the authoritative recorded video duration.');job.duration=duration;job.sourceProbe=sourceProbe;
    job.state='ready';job.message='Native FFmpeg ready.';
    const args=['-nostdin','-y','-i',job.input];if(job.music)args.push('-stream_loop','-1','-i',job.music.path);args.push('-map','0:v:0');
    if(job.music&&sourceHasAudio)args.push('-filter_complex',`[0:a:0]${normalizedAudio}[recorded];[1:a:0]volume=${job.music.volume},${normalizedAudio}[music];[recorded][music]amix=inputs=2:duration=longest:dropout_transition=0,atrim=start=0:end=${duration},asetpts=N/SR/TB,${normalizedAudio}[aout]`,'-map','[aout]');
    else if(job.music)args.push('-map','1:a:0','-filter:a:0',`volume=${job.music.volume},${normalizedAudio},atrim=start=0:end=${duration},asetpts=N/SR/TB,${normalizedAudio}`);
    else args.push('-map','0:a?');
    args.push('-vf','scale=1920:1080:flags=lanczos,fps=30','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-profile:a','aac_low','-b:a',job.music?'192k':'160k','-ar','48000','-ac','2');if(job.music)args.push('-t',String(duration));args.push('-movflags','+faststart','-f','mp4','-progress','pipe:2','-nostats',job.output);
    job.state='converting';job.message='Native FFmpeg conversion running.';const child=spawn(ffmpegPath,args,{windowsHide:true});job.child=child;let pending='';
    child.stderr.on('data',data=>{pending+=data.toString();const lines=pending.split(/\r?\n/);pending=lines.pop()||'';for(const line of lines){const [key,value]=line.split('=',2);if(key==='out_time_us'&&duration>0){job.progress=Math.max(job.progress,Math.min(99.5,Number(value)/1e6/duration*100));job.updatedAt=Date.now();}else if(key==='progress'){job.updatedAt=Date.now();}}});
    await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(`Native FFmpeg exited with code ${code}.`)));});
    job.state='validating';job.message='Validating H.264/AAC MP4.';const outputProbe=await probe(job.output),video=outputProbe.streams?.find(stream=>stream.codec_type==='video'),audio=outputProbe.streams?.find(stream=>stream.codec_type==='audio'),outputStat=await stat(job.output);
    const containerOk=/\b(mp4|mov)\b/.test(outputProbe.format?.format_name||''),videoOk=video?.codec_name==='h264'&&video?.width===1920&&video?.height===1080&&video?.pix_fmt==='yuv420p'&&video?.r_frame_rate==='30/1',audioRequired=sourceHasAudio||Boolean(job.music),audioOk=!audioRequired||(audio?.codec_name==='aac'&&audio?.profile==='LC'&&Number(audio?.sample_rate)===48000&&Number(audio?.channels)===2&&audio?.channel_layout==='stereo'),videoDuration=Number(video?.duration)||Number(outputProbe.format?.duration),audioDuration=Number(audio?.duration),durationOk=!job.music||(Number.isFinite(videoDuration)&&Number.isFinite(audioDuration)&&Math.abs(videoDuration-audioDuration)<=.1&&Math.abs(videoDuration-duration)<=.1);
    if(!containerOk)throw new Error(`Native MP4 validation failed for the container: ${JSON.stringify(outputProbe.format)}.`);
    if(!videoOk)throw new Error(`Native MP4 validation failed for H.264 1920x1080 30fps yuv420p: ${JSON.stringify(video)}.`);
    if(!audioOk)throw new Error(`Native MP4 validation failed for AAC-LC stereo 48 kHz audio: ${JSON.stringify(audio)}.`);
    if(!durationOk)throw new Error(`Native MP4 validation failed because audio/video duration does not match the recorded video (${duration}s): ${JSON.stringify({videoDuration,audioDuration})}.`);
    job.state='complete';job.message='Validated MP4 ready.';job.progress=100;job.probe=outputProbe;job.outputBytes=outputStat.size;job.updatedAt=Date.now();
  }catch(error){job.state='failed';job.message=error?.message??String(error);job.error=job.message;job.updatedAt=Date.now();}
}

async function acceptUpload(req,res){
  const declared=Number(req.headers['content-length']||0);if(!declared||declared>MAX_INPUT_BYTES){json(res,413,{error:'WebM upload size is missing or exceeds the 1 GB local conversion limit.'});return;}
  const directory=await mkdtemp(join(tmpdir(),'marble-football-mp4-')),id=crypto.randomUUID(),input=join(directory,'recording.webm'),output=join(directory,'recording.mp4'),musicExpected=req.headers['x-music-attached']==='1',job={id,directory,input,output,musicExpected,state:'uploading',message:'Receiving preserved WebM.',progress:0,createdAt:Date.now(),updatedAt:Date.now()};jobs.set(id,job);
  const destination=createWriteStream(input);let received=0;req.on('data',chunk=>{received+=chunk.length;if(received>MAX_INPUT_BYTES)req.destroy(new Error('Upload exceeds local conversion limit.'));});req.pipe(destination);
  try{await new Promise((resolve,reject)=>{destination.once('finish',resolve);destination.once('error',reject);req.once('error',reject);});job.inputBytes=received;job.updatedAt=Date.now();job.state=musicExpected?'awaiting-music':'uploaded';job.message=musicExpected?'Waiting for local music upload.':'WebM upload complete.';json(res,202,{jobId:id,architecture:'local-server-native-ffmpeg'});if(!musicExpected)void convert(job);}catch(error){jobs.delete(id);await rm(directory,{recursive:true,force:true});throw error;}
}

async function acceptMusic(req,res,job){
  if(!job.musicExpected||job.music)throw new Error('This conversion job is not waiting for music.');const declared=Number(req.headers['content-length']||0);if(!declared||declared>MAX_INPUT_BYTES)throw new Error('Music upload size is missing or exceeds the local limit.');const path=join(job.directory,'music-input'),destination=createWriteStream(path);req.pipe(destination);await new Promise((resolve,reject)=>{destination.once('finish',resolve);destination.once('error',reject);req.once('error',reject);});const requested=Number(req.headers['x-music-volume']),volume=Number.isFinite(requested)?Math.max(0,Math.min(1,requested)):.3;job.music={path,filename:decodeURIComponent(req.headers['x-music-name']||'music'),volume,bytes:declared};job.updatedAt=Date.now();json(res,202,{jobId:job.id,musicReceived:true,volume});void convert(job);
}

export async function handleConversionRequest(req,res){
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`),parts=url.pathname.split('/').filter(Boolean);
  if(url.pathname==='/api/mp4/health'&&req.method==='GET'){try{await Promise.all([access(ffmpegPath),access(ffprobePath)]);json(res,200,{ready:true,architecture:'local-server-native-ffmpeg',ffmpegPath,ffprobePath,sharedArrayBufferRequired:false});}catch(error){json(res,503,{ready:false,error:error.message});}return true;}
  if(url.pathname==='/api/mp4/jobs'&&req.method==='POST'){try{await acceptUpload(req,res);}catch(error){if(!res.headersSent)json(res,500,{error:error.message});}return true;}
  if(parts[0]==='api'&&parts[1]==='mp4'&&parts[2]==='jobs'&&parts[3]){const job=jobs.get(parts[3]);if(!job){json(res,404,{error:'Conversion job not found.'});return true;}
    if(parts[4]==='music'&&req.method==='POST'){try{await acceptMusic(req,res,job);}catch(error){if(!res.headersSent)json(res,400,{error:error.message});}return true;}
    if(parts.length===4&&req.method==='GET'){json(res,200,{id:job.id,state:job.state,message:job.message,progress:job.progress,inputBytes:job.inputBytes,outputBytes:job.outputBytes,duration:job.duration,probe:job.probe,error:job.error,updatedAt:job.updatedAt});return true;}
    if(parts[4]==='file'&&req.method==='GET'&&job.state==='complete'){const size=(await stat(job.output)).size;res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':size,'Content-Disposition':'attachment; filename="tournament.mp4"','Cache-Control':'no-store'});createReadStream(job.output).pipe(res);return true;}
  }
  return false;
}

setInterval(()=>{const cutoff=Date.now()-2*60*60*1000;for(const [id,job] of jobs){if(job.updatedAt<cutoff){job.child?.kill();jobs.delete(id);void rm(job.directory,{recursive:true,force:true});}}},10*60*1000).unref();
