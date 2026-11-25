Un materiale trasparente, un effetto outline e una superficie che si illumina con la luce della scena hanno in comune un problema: ognuno richiede passaggi extra nella pipeline di rendering e varianti di compilazione diverse. ShaderLab non serve solo a dichiarare un colore, è anche il posto dove si governano blend, depth, stencil, culling e varianti. Questa lezione mostra come, con esempi che rientrano nei problemi reali di un gioco: un vetro, un bordo selezionabile, un materiale che funziona in URP.

## Obiettivi

- Controllare blend, `ZWrite`, `Cull` e `Stencil` per un materiale trasparente corretto.
- Scrivere un effetto outline con due passaggi coordinati.
- Usare `multi_compile` e `shader_feature` per gestire le varianti senza esplosione di compilazione.
- Leggere le surface shader della Built-in pipeline e le loro limitazioni.

## Blend, depth e culling

Un materiale opaco scrive nel depth buffer e non ha bisogno di blend. Un materiale trasparente disattiva `ZWrite`, abilita `Blend` e ordina i passaggi in coda `Transparent`. Sbagliare una delle tre cose produce vetri che nascondono oggetti o doppioni visibili da una sola angolazione.

```shaderlab
SubShader
{
    Tags { "Queue" = "Transparent" "RenderType" = "Transparent" }
    Pass
    {
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Back
        // ... programma HLSL nell'altra lezione
    }
}
```

`Blend SrcAlpha OneMinusSrcAlpha` è l'alpha blending classico; per effetti additivi si usa `Blend One One`, per il premoltiplicato `Blend One OneMinusSrcAlpha`. `Cull Front` è la base di un effetto outline: il passaggio che disegna il bordo espande i vertici e mostra le facce posteriori, mentre il passaggio base disegna le facce anteriori sopra.

| Stato | Opzioni comuni | Effetto |
| --- | --- | --- |
| `Blend` | `SrcAlpha OneMinusSrcAlpha`, `One One`, `One Zero` | mix tra colore shader e buffer |
| `ZWrite` | `On`, `Off` | abilita o disabilita la scrittura depth |
| `ZTest` | `LEqual`, `Always`, `Equal` | condizione di profondità |
| `Cull` | `Back`, `Front`, `Off` | facce scartate |
| `Stencil` | `Ref`, `Comp`, `Pass`, `Fail` | mascheramento tra passaggi |

## Outline e passaggi coordinati

L'outline a due passaggi è l'esempio canonico: il primo passaggio espande la mesh e scrive le sole facce posteriori, il secondo disegna la superficie normale. L'ordine nel file conta solo se il secondo passaggio è `Queue` `Geometry` e il primo ha `ZTest` corretto, altrimenti il bordo copre la superficie.

```shaderlab
Pass
{
    Cull Front
    ZWrite Off
    Blend SrcAlpha One
    // vertice espanso lungo la normale
    #pragma vertex vert_bordo
    #pragma fragment frag_bordo
}
Pass
{
    Cull Back
    ZWrite On
    #pragma vertex vert
    #pragma fragment frag
}
```

Lo stencil è lo stesso principio applicato al mascherino: il passaggio di scritta imposta `Comp Always`, `Ref 1`, `Pass Replace`, quello interno usa `Comp Equal`, `Ref 1`. È il modo in cui si disegna un'area con contenuto arbitrario, come un ritratto in una UI 3D, senza ritagliare geometria.

## Varianti: multi_compile e shader_feature

Ogni `#pragma multi_compile` genera tutte le combinazioni delle keyword indicate, anche se nessun materiale le usa. Un solo `multi_compile` con tre keyword raddoppia lo spazio delle varianti tre volte, e con `#pragma multi_compile_fwdbase` e `multi_compile_fog` il numero cresce in fretta. `shader_feature` è più leggero perché include solo le varianti usate dal materiale in fase di build, ma su un materiale costruito a runtime la keyword può essere assente.

```shaderlab
#pragma shader_feature _BORDO_SOFT
#pragma multi_compile_fog
#pragma multi_compile_instancing

fixed4 frag (v2f i) : SV_Target
{
    fixed4 c = tex2D(_MainTex, i.uv) * _Colore;
    #ifdef _BORDO_SOFT
    c.a *= smoothstep(0, 1, i.uv.x);
    #endif
    UNITY_APPLY_FOG(i.fogCoord, c);
    return c;
}
```

I file `.shadervariants` riducono a build time le keyword compilate; la Build Variant collection di Unity 6 è lo strumento equivalente per gestire l'esplosione. Per un gioco con dieci effetti e venti keyword, la differenza tra `multi_compile` e `shader_feature` si misura in minuti di build e in MB di pacchetto.

## Surface shader: comodo e stretto

Nella Built-in pipeline, una surface shader dichiara la superficie e lascia al motore la generazione dei passaggi di luce. Si scrive `#pragma surface surf Standard` e una funzione `void surf (Input IN, inout SurfaceOutputStandard o)`; il compilatore genera i vertici, i passaggi forward, l'ombra e i passaggi meta.

| Aspetto | Surface shader | Vertex/fragment |
| --- | --- | --- |
| codice da scrivere | poco | tutto |
| passaggi di luce | generati | a mano |
| controllo pipeline | basso | completo |
| supporto URP | no | sì |
| debug | difficile | diretto |

La documentazione Unity indica le surface shader come legate alla Built-in pipeline e sconsigliate per i progetti nuovi. Per URP il percorso naturale è uno shader vertex/fragment con `HLSLPROGRAM`, oppure Shader Graph con una Custom Function quando serve codice.

## Errori comuni

- **Dimenticare `ZWrite Off` su un materiale trasparente**: le superfici si oscurano a vicenda perché scrivono depth senza ordine.
- **Alpha test con `Queue` transparenza**: si perde il beneficio del depth prepass e gli oggetti dietro vengono disegnati inutilmente; per i ritagli netti serve `AlphaTest` con `clip()`.
- **Troppi `multi_compile`**: la build cresce in modo non proporzionale e l'editor diventa lento nell'import.
- **Effetto outline che copre i dettagli della superficie**: il bordo espanso viene scritto in depth dopo la superficie; l'ordine va fissato con `ZTest LEqual` e `ZWrite Off` nel passaggio del bordo.
- **Shader URP con sintassi Built-in**: compila in alcuni punti e produce errori solo a runtime, quando una variabile globale è vuota.
- **Cambiare un tag senza riassegnare il materiale**: l'editor conserva i valori cached in alcuni casi.

## In sintesi

Blend, depth, culling e stencil sono il lessico di ShaderLab per controllare cosa finisce sullo schermo e in che ordine. L'outline e il mascherino mostrano che i passaggi sono un sistema di disegno coordinato, non blocchi indipendenti. Le varianti sono una decisione economica: `shader_feature` per ciò che dipende dal materiale, `multi_compile` solo per ciò che deve esistere sempre. Le surface shader restano utili per mantenere progetti Built-in, ma i progetti nuovi partono da vertex/fragment.
