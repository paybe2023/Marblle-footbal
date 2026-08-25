import { defineConfig } from 'vite';
import { handleConversionRequest } from './conversion-server.mjs';
export default defineConfig({base:'./',build:{outDir:'dist',assetsDir:'assets'},plugins:[{name:'local-native-mp4-converter',configureServer(server){server.middlewares.use(async(req,res,next)=>{try{if(await handleConversionRequest(req,res))return;next();}catch(error){next(error);}});}}]});
