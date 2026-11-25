Questo laboratorio trasforma il girato di un torneo in un artefatto pubblicabile: 90 secondi di highlight a 1080p, con titoli sovraimpressi, audio normalizzato e un poster per la miniatura. Si lavora solo con la CLI, in una cartella temporanea, producendo comandi ripetibili da uno script.

## Obiettivi

- Analizzare gli input con `ffprobe` e ricavare una scheda tecnica delle sorgenti.
- Estrarre un poster frame dall'istante giusto.
- Costruire una `filter_complex` con trim, scale, overlay testuale e normalizzazione audio.
- Verificare il risultato in modo oggettivo, senza guardare tutto il video.
- Misurare qualità e dimensione e confrontare due encode.

## Preparazione dell'ambiente

Serve FFmpeg 7.x con libx264 e la libreria libfreetype (per `drawtext`). Il primo controllo è che gli encoder e il filtro ci siano davvero, perché molte build minimali li omettono.

```bash
ffmpeg -version | head -1
ffmpeg -hide_banner -encoders | grep -E "libx264|libsvtav1|aac"
ffmpeg -hide_banner -filters | grep drawtext
mkdir -p lab-ffmpeg && cd lab-ffmpeg
```

Se `drawtext` manca, i passaggi con il testo si sostituiscono con `overlay` di un PNG preparato in un editor: il resto del laboratorio resta identico.

Gli input del laboratorio sono tre clip `capture-a.mkv`, `capture-b.mkv`, `capture-c.mkv` in formato variabile e un file audio `commento.wav`. Iniziamo dalla scheda tecnica, che dà il formato minimo comune fra le tre clip.

```bash
for f in capture-*.mkv; do
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,r_frame_rate,pix_fmt,codec_name -of csv=p=0 "$f" \
    | sed "s|^|$f: |"
done
```

Un risultato realistico vede `capture-a` a 1920x1080 60/1 `yuv420p`, `capture-b` a 2560x1440 60/1 `yuv420p10le` e `capture-c` a 1920x1080 30/1 `yuv420p`.

| Sorgente | Risoluzione | fps | pix_fmt | Azione necessaria |
| --- | --- | --- | --- | --- |
| capture-a | 1920x1080 | 60 | yuv420p | nessuna |
| capture-b | 2560x1440 | 60 | yuv420p10le | scale, format |
| capture-c | 1920x1080 | 30 | yuv420p | fps |

## Poster: un frame scelto, non un frame a caso

La miniatura va scelta su un frame specifico, non sul primo fotogramma. Per trovare il momento giusto si estrae una contact sheet con il filtro `tile`: 12 frame campionati dal video, in una griglia, da guardare una volta sola.

```bash
ffmpeg -i capture-a.mkv -vf "fps=1/30,scale=160:-1,tile=4x3" -frames:v 1 sheet.png
```

Individuato il secondo (per esempio 1:42, il frame dello scontro), estraiamo il fotogramma a piena risoluzione. Il seek preciso presuppone la ricodifica: qui non ci serve un MP4, ci serve un PNG.

```bash
ffmpeg -ss 00:01:42.500 -i capture-a.mkv -frames:v 1 poster.png
```

`-ss` prima di `-i` è veloce e restituisce il keyframe più vicino: per un poster può bastare. Per un poster legato a un evento preciso serve `-ss` dopo `-i`.

## Il montaggio da 90 secondi

Il video è composto da tre estratti: 35 secondi da `capture-a` (il primo punto), 30 da `capture-b` (il rovesciamento), 25 da `capture-c` (l'azione finale). Ogni estratto viene portato a 1080p60, `yuv420p`, con timestamp azzerati, e concatenato senza audio. Il commento registrato separatamente viene aggiunto come stream finale, normalizzato e limitato in lunghezza con `-shortest`.

```bash
ffmpeg -i capture-a.mkv -i capture-b.mkv -i capture-c.mkv -i commento.wav \
  -filter_complex "\
    [0:v]trim=start=10:duration=35,setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos,fps=60,format=yuv420p[v0]; \
    [1:v]trim=start=42:duration=30,setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos,fps=60,format=yuv420p[v1]; \
    [2:v]trim=start=5:duration=25,setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos,fps=60,format=yuv420p[v2]; \
    [v0][v1][v2]concat=n=3:v=1:a=0[m]; \
    [m]drawtext=fontfile=fonts/Inter-Bold.ttf:text='GRAN FINALE':fontcolor=white:fontsize=96:\
        box=1:boxcolor=black@0.45:boxborderw=24:x=(w-text_w)/2:y=h-text_h-120,\
        drawtext=fontfile=fonts/Inter-Bold.ttf:text='%{pts\\:hms}':fontcolor=white@0.75:\
        fontsize=36:x=40:y=h-text_h-40[v]" \
  -map "[v]" -map 3:a:0 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v libx264 -preset slow -crf 19 -profile:v high -level 4.1 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart \
  highlight.mp4
```

Tre punti da non dimenticare. `-af` vale per lo stream audio mappato, quindi si applica a `commento.wav`, non al video. `%{pts\\:hms}` richiede il doppio backslash nella shell, perché il filtro interpreta `:` come separatore. `-level 4.1` è il livello massimo accettato da molti lettori hardware per 1080p60 in High profile.

## Verifica oggettiva

Prima di fidarsi del risultato si controllano durata, stream e bitrate con `ffprobe`, poi si estrae una griglia di frame per vedere che i titoli siano leggibili.

```bash
ffprobe -v error -show_entries format=duration,size,bit_rate \
  -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -of default=nw=1 highlight.mp4
ffmpeg -v error -i highlight.mp4 -vf "fps=1/15,scale=320:-1,tile=3x2" -frames:v 1 check.png
```

La durata deve essere 90 secondi (o il valore dell'audio se è più corto e `-shortest` ha agito), `nb_frames` vicino a 5400 e audio `aac` a 48 kHz. Una durata di 90,4 secondi è sospetta: spesso un `fps` applicato prima del `trim` ha aggiunto frame all'inizio.

## Misurare, non indovinare

Chiusura del laboratorio: la stessa sorgente encoded a due CRF diversi, per decidere con i numeri invece che a occhio.

```bash
time ffmpeg -v error -y -i capture-a.mkv -t 20 -an -c:v libx264 -preset slow -crf 19 a19.mp4
time ffmpeg -v error -y -i capture-a.mkv -t 20 -an -c:v libx264 -preset slow -crf 23 a23.mp4
ls -l a19.mp4 a23.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of csv=p=0 a23.mp4
```

| Encode | Dimensione | Tempo CPU | Quando usarlo |
| --- | --- | --- | --- |
| CRF 19, slow | riferimento | alto | trailer definitivo, una volta sola |
| CRF 23, slow | circa 25-35% in meno | alto | iterazioni interne |
| CRF 23, fast | simile a 23 slow | basso | controlli rapidi durante il montaggio |

## Errori comuni

- **Concatenare con `fps` prima di `trim`**: i frame generati intervallati spostano il punto di inizio di ciascuna clip.
- **Dimenticare `format=yuv420p`**: la clip a 10 bit entra nel concat e il successivo encode H.264 fallisce o produce colori sbagliati.
- **Applicare `loudnorm` a due passaggi senza guardare i valori**: il filtro può variare il guadagno tra le esecuzioni se non si fissa il target.
- **Verificare solo a occhio**: una griglia di frame ogni 15 secondi scopre i problemi di allineamento in pochi minuti.
- **Scrivere il comando direttamente nel terminale**: salvato in `render.sh`, il comando diventa ripetibile e versionabile.

## In sintesi

Il laboratorio ha trasformato tre sorgenti eterogenee in un unico video coerente, senza perdere controllo sulle scelte: `ffprobe` per capire, `filter_complex` per uniformare, `-map` per assemblare, `ffprobe` di nuovo per verificare. Il poster estratto con il filtro `tile` chiude il ciclo della miniatura. Le stesse regole valgono per un asset in-game: la differenza è che lì conta il lettore del motore, non il browser.
