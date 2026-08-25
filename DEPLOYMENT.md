# Static deployment

Run `npm run build` and publish the generated `dist/` directory.

- Cloudflare Pages: build command `npm run build`, output directory `dist`
- Netlify: build command `npm run build`, publish directory `dist`
- Vercel: framework preset Vite, build command `npm run build`, output directory `dist`

The production bundle uses relative application assets and requires no Node server, localhost process, paid API, or conversion backend. HTTPS is required by browsers for reliable media capture outside localhost.

Recording is client-side. Browsers with native MediaRecorder MP4/H.264 support produce MP4. Other supported browsers preserve a genuine WebM recording and expose it explicitly as a recovery download; the application never renames WebM to MP4.
