La riga di comando di FFmpeg diventa potente quando smetti di concatenare opzioni e inizi a costruire un grafo di filtri: più ingressi, decodifica, trasformazioni, uscite multiple. E i filtri sono solo metà del problema: per un file che devono guardare cento persone serve anche che container e codec siano compatibili con chi lo riproduce. Questa lezione collega le due cose con esempi da pipeline di video di gioco: montaggio, ritaglio, overlay e scelta del formato di destinazione.

## Obiettivi

- Leggere e scrivere una `-filter_complex` con più ingressi e uscite.
- Ritagliare, scalare e concatenare clip senza introdurre scatti o salti di audio.
- Scegliere container e codec corretti per browser, editor e piattaforme social.
- Conservare i metadati giusti per un asset che verrà ripubblicato.

## Il grafo dei filtri

Ogni filtro ha un nome, un elenco di parametri e un'etichetta in ingresso e una in uscita: `[in]trim=start=10:end=15[out]`. La `-filter_complex` combina più catene, e `-map` decide quali etichette diventano stream dell'output. Il grafo è la soluzione per tutto ciò che coinvolge più sorgenti, come sovrapporre il logo del team al gameplay o affiancare due registrazioni.

```bash
ffmpeg -i gameplay.mkv -i logo.png \
  -filter_complex "[0:v]scale=1920:1080,fps=60[bg]; \
                   [1:v]scale=160:-1[lg]; \
                   [bg][lg]overlay=W-w-32:32[v]" \
  -map "[v]" -map 0:a:0 -c:v libx264 -crf 20 -c:a aac -b:a 160k out.mp4
```

`scale=160:-1` mantiene le proporzioni del logo, `-1` calcola l'altezza dal rapporto d'aspetto. `overlay=W-w-32:32` posiziona il logo in alto a destra con 32 pixel di margine. L'audio non passa dai filtri: viene mappato direttamente dallo stream `[0:a:0]`.

I filtri si compongono in catena con la virgola; senza la virgola sono filtri separati che richiedono etichette esplicite. Confondere i due genera grafi invalidi o risultati duplicati.

| Filtro | Uso tipico | Parametri chiave |
| --- | --- | --- |
| `trim` | tagliare una clip | `start`, `end`, `duration` |
| `scale` | adattare la risoluzione | `w:h`, `-1`, `flags=lanczos` |
| `fps` | normalizzare il frame rate | valore razionale o intero |
| `concat` | unire clip | `n`, `v`, `a` |
| `overlay` | sovrapporre un'immagine | posizione `x:y` |
| `drawtext` | sovrimpressione testuale | `text`, `fontfile`, `x`, `y` |

## Montaggio: taglio, normalizzazione e concatenazione

Il filtro `trim` è quello che si usa quando serve precisione al frame e si accetta una ricodifica. La `concat` invece di FFmpeg (da non confondere con il demuxer `concat:` che funziona a livello di file) vuole ingressi omogenei: stessa risoluzione, stesso pixel format, stesso frame rate, stesso numero di canali audio. Un clip registrato a 60 fps e uno a 30 con audio mono non si concatenano senza una normalizzazione a monte.

```bash
ffmpeg -i a.mp4 -i b.mp4 -i c.mp4 -filter_complex \
  "[0:v]trim=0:4,setpts=PTS-STARTPTS,fps=60[v0]; \
   [1:v]trim=2:6,setpts=PTS-STARTPTS,fps=60[v1]; \
   [2:v]trim=0:3,setpts=PTS-STARTPTS,fps=60[v2]; \
   [v0][v1][v2]concat=n=3:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -crf 18 -an montage.mp4
```

`setpts=PTS-STARTPTS` riazzera il timestamp, altrimenti `concat` mostra frame neri nella parte iniziale dei clip successivi al primo. Un errore identico sul lato audio si corregge con `asetpts=PTS-STARTPTS`. Se gli ingressi hanno formati diversi, il filtro `concat` si blocca con un errore esplicito: prima si convertono i frame con `format=yuv420p` e audio con `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo`.

Per una clip usata in un gioco come sequenza di texture, il `trim` a cavallo del frame non serve: il motore si aspetta frame esatti a intervalli regolari. In quel caso conviene estrarre una sequenza PNG con `-vf fps=30` e ricomporla fuori da FFmpeg.

## Destination format: browser, editor, social

Un fattore determinante è dove finisce il file. Un MP4 con H.264 `yuv420p` e AAC in 48 kHz funziona ovunque, browser compresi, ed è la scelta predefinita per qualunque asset di gioco. Un WebM con VP9 e Opus serve solo se il player lo supporta esplicitamente. ProRes e DNxHD vanno ai passaggi di montaggio, che ri-encodano comunque.

```bash
# asset web, massima compatibilità
ffmpeg -i master.mov -c:v libx264 -profile:v high -level 4.1 -crf 22 \
  -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -movflags +faststart web.mp4

# master per montaggio, senza perdita percepibile
ffmpeg -i master.mov -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le \
  -c:a pcm_s24le edit.mov
```

Il livello H.264 4.1 viene spesso richiesto da console e da alcuni lettori hardware: un 1080p60 rientra, un 4K no. Le build ufficiali di FFmpeg 7.x includono gli encoder nativi AV1 e l'encoder AAC nativo, quindi il comando sopra non richiede più build con libfdk_aac.

I metadati contano quando il file verrà ripubblicato: `-map_metadata 0` conserva titoli e copyright del sorgente, `-metadata:s:v:0 rotate=0` cancella una rotazione ereditata da un telefono, e `-map_chapters 0` mantiene i capitoli di un evento esportato da un editor.

## Errori comuni

- **Dimenticare `setpts` dopo `trim`**: il montaggio mostra freeze o frame neri perché i timestamp non sono contigui.
- **Concatenare senza normalizzare**: risoluzione, fps o layout audio diversi fanno fallire `concat` o producono un video distorto.
- **Usare `concat:` su file con parametri diversi**: quel demuxer si aspetta stream identici e produce audio e video disallineati senza errore.
- **Scegliere il formato in base al codec invece del lettore**: un HEVC a 10 bit splende in un test sul PC e fallisce su metà dei browser.
- **Non allineare l'audio**: `-shortest` risolve il caso in cui una traccia termina prima dell'altra, ma non il caso inverso.
- **Sottovalutare la CPU**: una `-filter_complex` con `scale` su 4K a 60 fps può essere più lenta dell'encode stesso.

## In sintesi

I filtri sono un grafo, non una lista: etichette e `-map` collegano ingressi e uscite mentre l'audio può restare fuori dai filtri. Trim e concat richiedono sempre il riazzeramento dei timestamp e la normalizzazione dei formati. Container e codec si scelgono in base al lettore di destinazione, con H.264 `yuv420p` come base universale, ProRes per il montaggio e AV1 come risparmio di spazio. I metadati sono parte del risultato, non un dettaglio finale.
