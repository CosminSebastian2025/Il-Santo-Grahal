Questo laboratorio porta un progetto Vulkan dal primo frame nero al primo triangolo stabilmente a schermo, e lo fa in un ordine che non nasconde i problemi: prima instance con validation layer, poi device e swapchain, poi pipeline e comandi. L'obiettivo non è copiare mille righe di tutorial, è averne quattrocento proprie e poterle spiegare. Il target è Vulkan 1.3 con GLFW 3.4 per la finestra su Windows o Linux, in C++17.

## Obiettivi

- Attivare il validation layer e leggere i suoi messaggi senza filtri.
- Creare le code separate per grafica e present e una swapchain che sopravvive al resize.
- Compilare un GLSL in SPIR-V a build time e caricarlo in una pipeline.
- Registrare i comandi in un command buffer riutilizzato ogni frame.
- Diagnosticare un triangolo invisibile con pochi strumenti.

## Passo 1: instance e validation

Il validation layer deve essere attivo dal primo secondo, altrimenti un errore di inizializzazione si manifesta cento frame dopo in un punto non correlato. Il layer `VK_LAYER_KHRONOS_validation` va verificato con `vkEnumerateInstanceLayerProperties` prima della creazione: su una macchina senza SDK Vulkan il layer non esiste e `vkCreateInstance` fallisce.

```cpp
VkInstanceCreateInfo ci{VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO};
const char* layers[] = { "VK_LAYER_KHRONOS_validation" };
const char* exts[]   = { VK_KHR_SURFACE_EXTENSION_NAME, VK_KHR_WIN32_SURFACE_EXTENSION_NAME };

VkDebugUtilsMessengerCreateInfoEXT dbg{VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT};
dbg.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
                      VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
dbg.messageType     = VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
                      VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
dbg.pfnUserCallback = &callback;

ci.enabledLayerCount = 1;
ci.ppEnabledLayerNames = layers;
ci.enabledExtensionCount = 2;
ci.ppEnabledExtensionNames = exts;
ci.pNext = &dbg;
```

Il messaggio del layer contiene un codice `VUID` e una lista di oggetti coinvolti: è il testo che si cerca nella specifica, non una frase da interpretare.

| Esigenza | Estensione richiesta |
| --- | --- |
| finestra su Windows | `VK_KHR_win32_surface` |
| finestra su Linux X11 | `VK_KHR_xlib_surface` |
| messaggi del validation layer | `VK_EXT_debug_utils` |
| presentazione | `VK_KHR_swapchain` |

## Passo 2: device, code e swapchain

Si sceglie una `VkPhysicalDevice` con una family capace di `GRAPHICS_BIT` e una con `PRESENT` verso la surface. Con `vkGetPhysicalDeviceSurfaceCapabilitiesKHR` e `vkGetPhysicalDeviceSurfaceFormatsKHR` si costruisce la swapchain: formato `VK_FORMAT_B8G8R8A8_UNORM` o `SRGB` secondo disponibilità, modalità `VK_PRESENT_MODE_MAILBOX_KHR` se c'è, altrimenti `FIFO` che è l'unica garantita.

Una swapchain resa con `VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR` e `minImageCount` uguale al massimo supportato evita di perdere immagini sul present. La ricostruzione si centralizza in una funzione `recreateSwapchain()` che distrugge image views, ricrea, e ri-ricrea tutto ciò che dipende dalla dimensione degli attachment.

```cpp
VkSurfaceCapabilitiesKHR caps;
vkGetPhysicalDeviceSurfaceCapabilitiesKHR(phys, surface, &caps);
uint32_t count = caps.minImageCount + 1;
if (caps.maxImageCount > 0 && count > caps.maxImageCount) count = caps.maxImageCount;
```

## Passo 3: shader, vertex buffer e pipeline

Lo shader è GLSL 450 compilato a build time. Aggiungiamo al CMake una regola che lancia `glslangValidator -V`, così lo `.spv` è un artefatto prodotto, non un file a mano.

```bash
glslangValidator -V -S vert triangolo.vert.glsl -o triangolo.vert.spv
glslangValidator -V -S frag triangolo.frag.glsl -o triangolo.frag.spv
```

La pipeline dichiara l'input vertex in modo identico al layout del buffer: attributi `vec2 pos` a `location 0` e `vec3 color` a `location 1`, stride 20 byte, offset 0 e 8. Il render pass usa un attachment `B8G8R8A8_UNORM` con `loadOp` `CLEAR` e `storeOp` `STORE`, e `imageLayout` iniziale `UNDEFINED` in ingresso, `PRESENT_SRC_KHR` in uscita.

Nell'esempio `vkCmdDraw(3, 1, 0, 0)` sta dentro il ciclo di registrazione, preceduto da `vkCmdBindVertexBuffers`. Se il triangolo non appare, si controlla nell'ordine: presenza di `vkCmdBeginRendering`, validità della `VkPipeline`, binding del vertex buffer.

## Passo 4: submit e frame loop

Il frame loop è quello dell'altra lezione, con un array di `FrameData` di dimensione 2 o 3. Il fence viene segnalato dal submit e atteso all'inizio del frame successivo; il semaforo di acquire protegge la transizione dell'immagine. Al resize si attendono le code in idle, si ricostruisce la swapchain, si continua.

| Strumento | Cosa dice | Quando usarlo |
| --- | --- | --- |
| validation layer | codice VUID e oggetti | dal primo frame, sempre |
| `vkQueueSubmit` error code | comando corrotto o risorsa sbagliata | crash o blocco |
| RenderDoc | griglia delle draw call | triangolo assente o nero |
| documento della specifica | contratto valido | quando VUID non basta |

## Passo 5: la checklist dell'invisibilità

Se lo schermo resta del colore di clear, la checklist è breve: nel command buffer c'è `vkCmdBeginRendering` prima del draw; il viewport è impostato o dichiarato dinamico; il triangle vertex shader produce coordinate in intervallo `[-1, 1]`; il fragment shader restituisce un colore non nero; il semaforo di acquire è atteso nel submit; e l'immagine è presentata con il semaforo corretto. Il 90% dei triangolo-non-visibili finisce qui.

## Esercizi

1. Sostituisci il clear color con il colore del clear di scena letto da un uniform aggiornato ogni frame.
2. Aggiungi una seconda pipeline con depth testing e disegnla dietro il triangolo.
3. Attiva una feature di `VK_EXT_extended_dynamic_state` per cambiare viewport senza ricreare la pipeline.
4. Misura con GPU-Z o con un timestamp query il tempo speso tra submit e present di cento frame.

<details>
<summary>Soluzione</summary>

1. Il clear color si passa in `VkRenderingAttachmentInfo` di `vkCmdBeginRendering`: non serve un uniform, basta aggiornare il campo `clearValue` in fase di registrazione.

2. Serve un attachment di depth con `loadOp` `CLEAR` e `storeOp` `DONT_CARE`, e una pipeline con `depthtestEnable` e `depthCompareOp` `LESS_OR_EQUAL`. Il senza depth resta davanti se disegnato dopo.

3. Con `VK_EXT_extended_dynamic_state` abilitata nel device, la pipeline dichiara `VK_DYNAMIC_STATE_VIEWPORT_WITH_COUNT` e il comando di registrazione chiama `vkCmdSetViewportWithCount` prima del draw.

4. Si crea un pool di timestamp, si scrive un timestamp al submit e un altro dopo il present, e si legge la differenza a frame indietro: il present non restituisce un valore, quindi la lettura deve avvenire a distanza.

</details>

## Errori comuni

- **Validation layer spento in debug**: crash senza messaggio e giorni persi.
- **Draw fuori da `vkCmdBeginRendering` o dal render pass**: il comando è valido ma non produce nulla.
- **Uniform buffer host-visible letto senza barrier**: alcuni frame mostrano dati vecchi.
- **Ricreare la swapchain senza ricreare image views**: errore su resize, spesso solo dopo diverse finestre.
- **Dimenticare `vkCmdBindVertexBuffers`**: nessun errore, nessun triangolo.
- **Compilare SPIR-V con un target diverso** (`--target-env vulkan1.0` su un layout 450 con feature 1.3): errore di validazione all'ingresso.

## In sintesi

Il laboratorio ha percorso il minimo indispensabile per un'immagine: validation layer, device, swapchain, pipeline, command buffer, submit e present. Ogni passaggio ha un controllo che dice se è corretto, e la checklist dell'invisibilità copre i fallimenti silenziosi. Da qui il percorso naturale è un renderer che non ricrea la swapchain a ogni resize e un sistema di allocazione invece di `vkAllocateMemory` sparso.
