In questo laboratorio scrivi da zero un materiale per la selezione di un'unità: una superficie che pulsa con la luce dei materiali vicini, disegna un contorno quando è selezionata e si comporta correttamente davanti e dietro gli oggetti della scena. Il percorso è quello che useresti in un progetto vero: costruzione del file, materiale in scena, attivazione della keyword, controllo della geometria con la visualizzazione wireframe, misurazione della build. Il target è un progetto di test in **Unity 6 (6000.0)** con **URP 17**.

## Obiettivi

- Creare un progetto di test URP e un materiale vertex/fragment conforme al CBUFFER del SRP Batcher.
- Disegnare un contorno di selezione con un secondo passaggio che espande i vertici.
- Attivare e disattivare il contorno con una keyword anziché creare due materiali.
- Verificare il blending con la visualizzazione wireframe e il Frame Debugger.
- Misurare l'impatto su build e varianti.

## Passo 1: progetto e struttura dei file

Creiamo un progetto vuoto con template URP 3D, poi una cartella `Assets/Shaders`. Il file si chiama `SelezioneUnita.shader` e inizia con un blocco che dichiara le proprietà e la coda di disegno.

```shaderlab
Shader "Gioco/SelezioneUnita"
{
    Properties
    {
        _BaseMap ("Albedo", 2D) = "white" {}
        _BaseColor ("Tinta", Color) = (1,1,1,1)
        _OutlineColor ("Colore bordo", Color) = (0, 0.85, 1, 1)
        _OutlineWidth ("Spessore bordo", Range(0.0, 0.05)) = 0.012
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry" }

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _BaseColor;
            half4 _OutlineColor;
            float _OutlineWidth;
        CBUFFER_END
        ENDHLSL
```

Tutte le proprietà del materiale stanno dentro `UnityPerMaterial`: è la condizione per il SRP Batcher. La dichiarazione della texture va fatta fuori dal CBUFFER, perché le texture non hanno un formato compatibile con i buffer costanti.

## Passo 2: il passaggio principale

Il passaggio principale trasforma la posizione, campiona l'albedo e applica una luce ambiente semplice, senza sistema di illuminazione completo: ci interessa il flusso di lavoro, non il modello di shading.

```shaderlab
        Pass
        {
            Name "ForwardUnlit"
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma shader_feature _OUTLINE_ON

            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv) * _BaseColor;
                return half4(albedo.rgb * UNITY_PI, albedo.a);
            }
            ENDHLSL
        }
```

`TRANSFORM_TEX` applica gli offset di tiling che il materiale salva in `_BaseMap_ST`. `TransformObjectToHClip` è la funzione URP equivalente di `UnityObjectToClipPos` della pipeline Built-in.

## Passo 3: il contorno con espansione delle normali

Il secondo passaggio disegna solo le facce posteriori, spostate verso l'esterno lungo la normale: la sagoma risulta più grande della superficie e visibile solo quando è selezionata.

```shaderlab
        Pass
        {
            Name "Outline"
            Tags { "LightMode" = "SRPDefaultUnlit" }
            Cull Front
            ZWrite Off
            ZTest LEqual

            HLSLPROGRAM
            #pragma vertex vert_out
            #pragma fragment frag_out
            #pragma shader_feature _OUTLINE_ON

            struct A { float4 positionOS : POSITION; float3 normalOS : NORMAL; };
            struct V { float4 positionHCS : SV_POSITION; };

            V vert_out (A IN)
            {
                V OUT;
                float3 posOS = IN.positionOS.xyz + IN.normalOS * _OutlineWidth;
                OUT.positionHCS = TransformObjectToHClip(posOS);
                return OUT;
            }

            half4 frag_out (V IN) : SV_Target { return _OutlineColor; }
            ENDHLSL
        }
    }
    FallBack "Universal Render Pipeline/Unlit"
}
```

Lo spessore in unità di oggetto produce bordi diversi su un personaggio di 2 metri e su una torre di 20: per un risultato uniforme si sposta il vertice in spazio clip oppure si normalizza la distanza. Il tag `SRPDefaultUnlit` è il modo con cui URP esegue un pass che non è l'illuminazione principale.

## Passo 4: materiale e keyword

Creiamo il materiale dal menu, scegliamo lo shader `Gioco/SelezioneUnita`, assegniamo la texture e impostiamo la keyword: in URP non basta il campo materiale, la keyword va abilitata sul materiale con il menu a tre puntini nell'Inspector o via script.

```csharp
var mat = new Material(Shader.Find("Gioco/SelezioneUnita"));
mat.SetFloat("_OutlineWidth", 0.012f);
mat.EnableKeyword("_OUTLINE_ON");
renderer.material = mat;
```

Se la keyword non viene abilitata, `shader_feature` non compila la variante e il contorno non appare. Nella build, un materiale creato a runtime con una keyword non presente in nessun asset può produrre un contorno invisibile: la Build Variant collection di Unity 6 serve a forzare la compilazione.

## Passo 5: verifica visiva e costi

Con l'oggetto selezionato in scena, apriamo il Frame Debugger e cerchiamo le due chiamate: `ForwardUnlit` e `Outline`. Se ne compare una sola, il motivo è quasi sempre una keyword non attiva o un `LightMode` non riconosciuto. Con la visualizzazione wireframe si controlla che il bordo esca dalla sagoma senza sbavature.

| Controllo | Cosa guardare | Se fallisce |
| --- | --- | --- |
| Frame Debugger | due draw call per renderer | keyword o LightMode |
| wireframe | bordo uniforme | spessore in spazio oggetto |
| Inspector del materiale | nessun avviso SRP Batcher | proprietà fuori da CBUFFER |
| build log | numero di varianti | troppe `multi_compile` |

Misurazione finale: nella console di build confrontiamo il numero di varianti compilate con e senza `#pragma shader_feature _OUTLINE_ON`. Una variante in più è accettabile; dieci significano che una `multi_compile` è entrata nel file per errore.

## Errori comuni

- **Mettere la texture dentro `UnityPerMaterial`**: errore di compilazione, perché il CBUFFER accetta solo tipi numerici.
- **Usare `Queue` `Transparent` per il contorno**: il bordo si ordina dietro oggetti che dovrebbe coprire.
- **Lasciare `ZWrite On` nel contorno**: la superficie principale viene nascosta dal bordo espanso.
- **Aspettarsi il contorno senza `EnableKeyword`**: la variante non esiste e il passaggio resta identico all'originale.
- **Misurare a memoria**: senza Frame Debugger è impossibile distinguere un pass mancante da un pass ottimizzato dal motore.

## In sintesi

Il laboratorio ha coperto l'intero ciclo: dichiarazione delle proprietà nel CBUFFER, passaggio principale URP, contorno con cull front e keyword, verifica con il Frame Debugger e misura delle varianti. Il materiale che ne risulta è parametrizzabile dall'Inspector senza nuovi file. Il passo successivo è spostare il calcolo del bordo in spazio schermo per ottenere uno spessore indipendente dalla distanza.
