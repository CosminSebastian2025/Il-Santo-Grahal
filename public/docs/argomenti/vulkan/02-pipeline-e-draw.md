Un triangolo in Vulkan non è un esercizio di disegno: è la prima volta che memoria, descriptor, pipeline e render pass devono essere coerenti tra loro. Chi arriva da OpenGL incontra qui il salto culturale. Questa lezione smonta l'oggetto più intimidatorio, `VkGraphicsPipeline`, e spiega come si arriva a un draw call: dati in un buffer, una pipeline statica compilata in anticipo, uno shader SPIR-V, e uno o più comandi registrati.

## Obiettivi

- Delegare la memoria a un allocator specializzato e capire perché.
- Costruiamo `VkPipeline` con gli stage, il vertex input e il layout dei descriptor.
- Trasformare GLSL o HLSL in SPIR-V e che cosa è SPIR-V rispetto al codice della GPU.
- Spiegare quando una pipeline va ricreata e perché farlo a ogni frame è sbagliato.

## Memoria: nessuna allocazione nascosta

Vulkan non alloca memoria quando crei una texture: prima riserva un blocco con `vkAllocateMemory`, poi lo associa alla risorsa con `vkBindImageMemory` o `vkBindBufferMemory`. La gestione manuale è insostenibile oltre poche risorse, per questo si usa Vulkan Memory Allocator (VMA), che gestisce blocchi grandi e sottostrutture per risorsa.

```c
VkBufferCreateInfo bi = { .sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO };
bi.size = 3 * sizeof(Vertex);
bi.usage = VK_BUFFER_USAGE_VERTEX_BUFFER_BIT;
bi.sharingMode = VK_SHARING_MODE_EXCLUSIVE;

VmaAllocationCreateInfo ai = {0};
ai.usage = VMA_MEMORY_USAGE_AUTO;
ai.flags = VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT |
           VMA_ALLOCATION_CREATE_MAPPED_BIT;

VkBuffer vertexBuffer;
VmaAllocation alloc;
vmaCreateBuffer(vmaAllocator, &bi, &ai, &vertexBuffer, &alloc, NULL);
```

Una distinzione importante: la memoria non è visibile alla CPU e alla GPU allo stesso modo. Un buffer vertex scritto una volta sta in memoria locale GPU; i uniform con parametri aggiornati per oggetto finiscono invece in buffer host-visible o in blocchi di descriptor ring. Mescolare le due cose è la fonte più comune di cali inspiegabili.

## La pipeline grafica come modulo

`VkPipeline` contiene la configurazione completa: gli stage, il triangolo di tessellazione, la rasterizzazione, la viewport, il depth-stencil, il blending, e il layout con cui gli shader si collegano. Una volta creata, `vkCmdBindPipeline` la rende attiva. Modificare uno dei parametri richiede una nuova pipeline, oppure usa feature dinamiche (`VK_DYNAMIC_STATE_VIEWPORT`, `VK_DYNAMIC_STATE_LINE_WIDTH`) che la lasciano aggiornare a runtime.

| Stato | Statico o dinamico | Costo |
| --- | --- | --- |
| shader vertex/fragment | statico | ricompila se cambia |
| blend e depth | statico con `VK_EXT_extended_dynamic_state` opzionale | pipeline a varianti |
| viewport e scissor | dinamico abbastanza frequentemente | trascurabile |
| vertex input | statico | nuovo layout = nuova pipeline |
| descriptor set layout | statico | compatibile solo con set coerenti |

Lo shader input viene da un `VkShaderModule` creato da codice SPIR-V. SPIR-V non è il codice della GPU: è un linguaggio intermedio standardizzato, che il driver converte in istruzioni native. Uno shader GLSL 460 equivalente si compila con `glslangValidator -V shader.vert -o shader.vert.spv`. In produzione si precompila a build time; la compilazione a runtime da GLSL esiste ma aggiunge costi di primo caricamento e dipendenza dalla versione del driver.

Ogni `VkPipeline` è legata a un `VkPipelineLayout`, che fissa i descriptor set e i push constant visibili agli shader. Cambiare il layout significa ricreare tutte le pipeline che lo usano: è il motivo per cui lo si progetta prima di scrivere il rendering.

| Chiamata | Scopo | Aggiornata per disegno |
| --- | --- | --- |
| `vkCmdBindPipeline` | shader e stato | quando cambia la variante |
| `vkCmdBindDescriptorSets` | uniform e texture | quando cambiano i dati |
| `vkCmdBindVertexBuffers` | dati dei vertici | raramente |
| `vkCmdPushConstants` | parametri rapidi | sempre, finché la dimensione è piccola |
| `vkCmdDraw` | draw non indicizzato | ogni oggetto |
| `vkCmdDrawIndexed` | draw con index buffer | ogni oggetto con indice |

## Descriptor: legare dati e shader

Un `VkDescriptorSet` è un puntatore verso buffer e texture. Il suo layout è dichiarato una volta, l'oggetto è aggiornato quando i parametri cambiano. Il costo è nel numero di `vkUpdateDescriptorSets` e nella cache: aggiornare un set per ogni oggetto è il collo di bottiglia classico.

```glsl
#version 450
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec3 aColor;
layout(location = 0) out vec3 vColor;
layout(set = 0, binding = 0) uniform Ubo { mat4 mvp; } ubo;

void main() {
    gl_Position = ubo.mvp * vec4(aPos, 0.0, 1.0);
    vColor = aColor;
}
```

Il comando di disegno è breve, ma presuppone l'intera catena: `vkCmdBindPipeline`, eventuali `vkCmdBindVertexBuffers` e `vkCmdBindDescriptorSets`, poi `vkCmdDraw(3, 1, 0, 0)`.

## Errori comuni

- **Usare pipeline diverse per ogni disegno**: la creazione di pipeline rallenta il frame; conviene raggruppare i disegni per pipeline.
- **Dichiarare un descriptor set layout diverso da quello usato** nello shader: errore di validazione o risultati vuoti.
- **Leggere gli attributi nella pipeline in modo diverso dallo shader**: la validazione segnala `VUID-VkGraphicsPipelineCreateInfo-Input-vertexFormat`, ma solo se abilitata.
- **Compilare GLSL a runtime in release**: costi di primo caricamento e dipendenza da driver; precompila.
- **Ignorare che `vkCmdDraw` senza barrieri legge dati scritti nella fase precedente**: visibilità e disponibilità non sono automatiche.

## In sintesi

Vulkan rende espliciti i tre legami che le API moderne tenevano nascosti: memoria e allocator, stato e pipeline precompilata, dati e descriptor. SPIR-V è il formato di circolazione degli shader, GLSL e HLSL sono il testo sorgente. Il `vkCmdDraw` finale sembra minuscolo solo perché tutto il costo è stato pagato prima. Il passo successivo è capire la sincronizzazione attorno alle due operazioni che possono cambiare la swapchain.
