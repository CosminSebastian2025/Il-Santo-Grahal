Un file ShaderLab è il contratto tra il motore Unity e la GPU: descrive quali dati l'editor espone nell'Inspector, come il materiale si comporta nei passaggi di rendering e quale codice HLSL viene realmente compilato per ogni piattaforma. Lo ShaderLab stesso non è un linguaggio di shading, è il formato di dettaglio che avvolge i programmi e li mette in collegamento con il sistema di rendering. Questa prima lezione costruisce il modello di quel contratto, usando Unity 6 (documentazione `6000.0`) come riferimento.

## Obiettivi

- Distinguere le parti di un file ShaderLab: `Properties`, `SubShader`, `Pass`, `Fallback`.
- Scrivere uno shader non illuminato minimale con un blocco `CGPROGRAM`.
- Capire la differenza tra Built-in Render Pipeline e URP nelle dichiarazioni di shader.
- Riconoscere le ragioni per cui un passaggio viene eseguito o scartato.

## Il linguaggio non è il linguaggio di shading

ShaderLab è una sintassi dichiarativa in stile C-like, con blocchi annidati. Il codice eseguibile è HLSL, dentro blocchi `CGPROGRAM`/`ENDCG` (storico, ancora supportato) o `HLSLPROGRAM`/`ENDHLSL` (usato da URP e HDRP). Il compilatore ShaderLab prende la descrizione, la interpreta in fase di import, e passa i programmi HLSL al compilatore per la piattaforma di destinazione: DX11, DX12, Vulkan, Metal, OpenGL ES.

Il risultato più importante è che un file sorgente può generare decine di varianti compilate. Il blocco `Pass` può dichiarare `#pragma vertex` e `#pragma fragment` per indicare le funzioni HLSL che entrano nella pipeline. Se una `#pragma` manca, il passaggio non ha programmi validi e il materiale appare magenta.

Un file ShaderLab minimo, non illuminato, che disegna il colore esposto nell'Inspector:

```shaderlab
Shader "Esempi/ColoreSemplice"
{
    Properties
    {
        _Colore ("Colore", Color) = (1, 0.5, 0, 1)
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "Queue" = "Geometry" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata { float4 vertex : POSITION; };
            struct v2f { float4 pos : SV_POSITION; };

            fixed4 _Colore;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                return _Colore;
            }
            ENDCG
        }
    }
    Fallback Off
}
```

La semantica `POSITION` arriva dal vertex buffer, `SV_POSITION` è il clip space in uscita, `SV_Target` è il buffer colore. `UnityObjectToClipPos` moltiplica per `UNITY_MATRIX_MVP`, che il motore aggiorna per ogni renderer.

## La struttura: Shader, SubShader e Pass

Un `Shader` contiene uno o più `SubShader`, e Unity sceglie il primo compatibile con la piattaforma: la selezione è per caratteristiche hardware, non per qualità artistica, quindi un SubShader con `Target 4.5` resta inutilizzato su una GPU mobile ES 3.0. Ogni SubShader contiene `Pass`, e ogni `Pass` è un disegno completo.

| Elemento | Scopo | Esempio |
| --- | --- | --- |
| `Properties` | variabili esposte al Material | `_Colore ("Colore", Color) = (1,1,1,1)` |
| `Tags` | informazioni per il motore | `"Queue" = "Transparent"` |
| `Pass` | un disegno completo | forward base, shadow caster |
| `Fallback` | shader se nessun SubShader è compatibile | `Fallback "Diffuse"` |
| `LOD` | complessità massima accettata | `LOD 200` |

I tag più usati sono `Queue` (ordine di disegno: `Background` 1000, `Geometry` 2000, `AlphaTest` 2450, `Transparent` 3000, `Overlay` 4000), `RenderType` (`Opaque`, `Transparent`, `TransparentCutout`) e `IgnoreProjector`. Un materiale trasparente con `Queue` `Geometry` soffre di artefatti di ordinamento: la coda non è un dettaglio estetico.

Un passaggio può dichiarare `LightMode` per essere eseguito dalla pipeline in un momento preciso: `ForwardBase`, `ShadowCaster`, `DepthOnly`, `Meta`. Nella Built-in Render Pipeline la scelta è il motore che la fa in base al contesto; in URP il ruolo è coperto in parte dallo stesso tag e in parte dalla struttura degli shader.

## Built-in e URP: due contratti diversi

La Built-in Render Pipeline compila gli shader con `CGPROGRAM` e include `UnityCG.cginc`. URP usa `HLSLPROGRAM` con `Core.hlsl` e funzioni diverse (`TransformObjectToHClip`, `GetVertexPositionInputs`). Un file scritto per la Built-in pipeline in un progetto URP non diventa magenta ma produce un risultato sbagliato: sono compilati i programmi, ma le variabili globali che il pass si aspetta non sono popolate.

| Aspetto | Built-in | URP (Unity 6) |
| --- | --- | --- |
| blocco programma | `CGPROGRAM` | `HLSLPROGRAM` |
| include base | `UnityCG.cginc` | `Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl` |
| trasformazione vertice | `UnityObjectToClipPos` | `TransformObjectToHClip` |
| definizione proprietà | `fixed4 _Colore;` | `CBUFFER_START(UnityPerMaterial)` |
| SRP Batcher | non applicabile | richiede il CBUFFER corretto |

Il punto più delicato è il `CBUFFER_START(UnityPerMaterial)`: senza, lo shader funziona ma rompe la compatibilità con SRP Batcher, e la documentazione Unity segnala che tutti i materiali che usano quello shader non possono essere raggruppati.

## Errori comuni

- **Dimenticare `#pragma vertex` o `#pragma fragment`**: il pass non compila, il renderer appare magenta e l'errore compare nel log dell'editor.
- **Usare `fixed4` per dati che superano l'intervallo 0-1**: `fixed` è a precisione ridotta e su mobile perde i valori HDR.
- **Mettere una proprietà in URP fuori da `CBUFFER_START(UnityPerMaterial)`**: SRP Batcher disattivato per lo shader, con calo di prestazioni difficile da attribuire.
- **Confondere `Queue` con l'ordine di trasparenza**: `Queue` decide il gruppo, l'order dentro il gruppo dipende dalla distanza e dal `ZWrite`.
- **Assumere che `Fallback Off` sia sicuro**: se nessun SubShader è compatibile la geometria non viene disegnata, senza un errore leggibile.
- **Ricompilare solo dal Project window**: alcune modifiche di tag e di varianti richiedono riapertura del materiale o della scena.

## In sintesi

ShaderLab descrive proprietà, tag, passaggi e fallback, e lascia a HLSL il compito di calcolare posizioni e colori. Unity sceglie il SubShader compatibile con la piattaforma ed esegue un Pass per ogni momento della pipeline che lo richiede. Built-in e URP sono contratti diversi, non varianti di stile. Un errore ShaderLab si vede come magenta: prima di cercare nel codice HLSL, controllare le pragma e i tag.
