# Approved audio assets

Place only intentionally approved files in `music/`, `crowd/`, or `sfx/` and register them in the matching `manifest.json`.

Music entries use:

```json
{"id":"track-id","title":"Track title","file":"audio/music/file.ogg","source":"Where it came from","license":"Exact license or permission","attributionRequired":false,"attributionText":""}
```

The application does not infer that a track is safe for YouTube. Keep the source, exact license, and required attribution with every approved track. Empty manifests are valid and produce a silent tournament.
