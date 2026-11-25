FFmpeg non è un programma solo: è una collezione di librerie (libavcodec, libavformat, libavfilter, libswscale, libswresample) più tre eseguibili da riga di comando — `ffmpeg`, `ffprobe`, `ffplay` — che coprono registrazione, conversione, analisi e riproduzione di file audio e video. In campo videoludico è lo strumento che sta tra il gioco e il file pubblicato: cattura del gameplay, generazione di trailer, transcodifica degli asset video, estrazione di frame da sequenze per texture animate. Questa prima lezione spiega il modello mentale che serve prima di scrivere qualsiasi comando lungo.

## Obiettivi

- Distinguere stream, container e codec e leggere l'output di `ffprobe`.
- Costruire comandi dove l'opzione giusta finisce nello stream giusto.
- Capire quando la copia degli stream (`-c copy`) è la scelta corretta e quando non lo è.
- Riconoscere i fattori che determinano qualità e dimensione dell'output.

## Stream, container e codec

Un file `.mp4` è un contenitore: un indice che descrive uno o più stream (video, audio, sottotitoli, dati) e dove si trovano i byte di ciascuno. Lo stream video è codificato con un codec (H.264, HEVC, AV1, VP9), quello audio con un altro (AAC, Opus, FLAC). Il container e il codec sono scelte indipendenti, con vincoli di compatibilità: un MP4 può contenere H.264 e AAC, raramente Opus senza accorgimenti.

Per un trailer di gioco catturato a 1440p su PC, il primo passo è sempre interrogare il file, non indovinare:

```bash
ffprobe -v error -show_entries \
  stream=index,codec_name,codec_type,width,height,r_frame_rate,pix_fmt,bits_per_raw_sample \
  -show_entries format=duration,bit_rate,size \
  -of json capture.mkv
```

L'output JSON elenca per esempio uno stream `h264` con `pix_fmt` `yuv420p10le` e un audio `aac`. Da qui derivano tutte le decisioni successive: se il pixel format è a 10 bit, una conversione verso H.264 8 bit richiede una mappatura esplicita; se il frame rate è `60000/1001`, l'opzione `-r 60` non è un arrotondamento innocuo.

| Concetto | Esempio | Dove lo trovi |
| --- | --- | --- |
| Container | MP4, MKV, WebM | estensione del file, `format_name` |
| Codec video | h264, hevc, av1, vp9 | `codec_name` nello stream |
| Codec audio | aac, opus, pcm_s16le | `codec_name` nello stream |
| Pixel format | yuv420p, yuv420p10le, rgba | `pix_fmt` |
| Bitrate | 8M video, 192k audio | `bit_rate` o opzione `-b:v` |

## Anatomia di un comando

Un comando FFmpeg si legge come una catena: input, eventuali filtri, mappatura degli stream, opzioni di codifica per ogni stream, output. Le opzioni hanno effetto sull'elemento successivo a cui si riferiscono, non su tutto il comando. È la regola che provoca più errori quando si copia un comando dal web e si mescola con un secondo input.

```bash
ffmpeg -i capture.mkv -c:v libx264 -crf 20 -preset slow \
  -c:a aac -b:a 192k -pix_fmt yuv420p -movflags +faststart trailer.mp4
```

Qui `-c:v` riguarda solo lo stream video, `-c:a` solo quello audio, e `-movflags +faststart` sposta l'atomo `moov` in testa al file per permettere lo streaming progressivo nel browser. Dal 2024 FFmpeg include un encoder AAC nativo (`aac`, come nel comando sopra); le build più vecchie richiedono libfdk_aac o si limitano a quello nativo con qualità inferiore.

Con più input l'ordine conta più che mai: le opzioni poste prima del secondo `-i` valgono per il primo input (per esempio `-ss` per il seek), quelle dopo valgono per l'output.

```bash
ffmpeg -ss 00:01:30 -i partita.mkv -t 15 -c copy highlight.mkv
```

Questo taglia 15 secondi senza ricodifica: `-ss` prima di `-i` fa seek rapido sul container, `-c copy` evita qualsiasi lavoro sulla CPU. Il taglio risulta però solo a keyframe vicini, quindi il punto di inizio può spostarsi di qualche centesimo.

| Opzione | Effetto | Nota pratica |
| --- | --- | --- |
| `-c:v libx264` | encoder software H.264 | compatibile ovunque, lento |
| `-c:v libsvtav1` | encoder software AV1 | ottimo rapporto qualità/dimensione |
| `-c copy` | nessuna ricodifica | velocissimo, tagli ai keyframe |
| `-crf 20` | qualità costante | valori bassi = più qualità |
| `-preset slow` | più lavoro per byte | solo per encode software |
| `-movflags +faststart` | indice in testa | necessario per il web |

## Qualità, dimensione e scelte pragmatiche

Un encode H.264 a CRF 18–23 copre quasi tutti i casi di linea di base; CRF 23 è il default di libx264 e produce file sensibilmente più pesanti di AV1 a parità di qualità percepita. AV1 (via libsvtav1 o encoder hardware sulle GPU recenti) riduce la dimensione ma pesa di più in decodifica: su macchine modeste la riproduzione può scattare. Per i video di gioco con molto movimento, oltre al CRF conviene alzare il tetto di bitrate con `-maxrate` e `-bufsize`, altrimenti le scene concitate diventano blocchettose.

La risoluzione non si sceglie solo per il pannello di destinazione: un trailer 4K che verrà visto su YouTube va caricato in 4K perché la piattaforma assegna più bitrate per risoluzione, mentre un asset in-game per un'interfaccia mobile va ridotto a 1280x720 e ricodificato con un bitrate basso.

## Errori comuni

- **Ricodificare quando basta copiare**: per cambiare solo il container (`MKV` verso `MP4`) `-c copy` è sufficiente e istantaneo, sempre che codec e pixel format siano compatibili.
- **Mettere `-ss` sempre prima dell'input**: garantisce velocità ma non precisione; quando il taglio deve partire al frame esatto, va messo dopo l'input e accetta una ricodifica.
- **Mescolare opzioni di stream diversi**: `-crf` con un encoder hardware viene ignorato, perché NVENC usa `-cq`; il comando funziona ma non fa quello che sembra.
- **Assumere un solo stream per tipo**: un MKV con più tracce audio o sottotitoli produce output dove FFmpeg sceglie la traccia "migliore" per default; se il risultato è sbagliato serve `-map`.
- **Ignorare il pixel format**: un output a 10 bit inserito in un player o in un motore che si aspetta `yuv420p` appare con colori slavati.

## In sintesi

FFmpeg ragiona per stream dentro container, e ogni opzione si applica all'elemento successivo nel comando. `ffprobe` è la prima cosa da usare, non l'ultima. `-c copy` è l'ottimizzazione predefinita per ogni lavoro che non richiede una ricodifica. Scegliere codec, CRF e preset in base al destinatario dell'output — browser, piattaforma video, motore di gioco — evita di rifare l'encode due volte.
