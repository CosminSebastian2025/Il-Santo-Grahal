Vulkan è l'API grafica a basso livello di Khronos, successore concettuale di OpenGL e alternative a DirectX 12 e Metal. La differenza rispetto a OpenGL è il punto di partenza: Vulkan non nasconde la gestione della memoria, non valida ogni chiamata e non corregge le tue decisioni. In cambio, il driver lavora meno a runtime e il gioco decide come distribuire il lavoro su più core. Questa lezione spiega il modello che regge tutto il resto: istanza, device, code, sincronizzazione e comandi registrati in anticipo.

## Obiettivi

- Capire la catena istanza, surface, device fisico, device logico, swapchain.
- Distinguere le code (queue) per famiglia e il ruolo dei semafori.
- Ricostruire il ciclo di un frame in Vulkan 1.3.
- Sapere cosa non c'è in Vulkan e viene dalla libreria o dal tuo codice.

## Oggetti e catena di inizializzazione

Vulkan è un insieme di oggetti opachi identificati da handle: `VkInstance`, `VkPhysicalDevice`, `VkDevice`, `VkSwapchainKHR`, `VkCommandBuffer`. Ogni oggetto ha una funzione di creazione e una di distruzione, e la documentazione impone un ordine preciso. Un `VkInstance` contiene i layer, cioè componenti come validation layer e strumenti di profilazione, e le estensioni di istanza, come quelle di surface per la finestra. `vkEnumeratePhysicalDevices` restituisce le GPU disponibili: per ciascuna si chiedono proprietà e code family, e si sceglie in base a tipo (`DISCRETE_GPU`), memoria e presenza di una queue con `GRAPHICS_BIT` e di una con `PRESENT` verso la propria surface. `vkCreateDevice` riceve l'elenco di code con le priorità e le estensioni di device attivate.

```c
VkApplicationInfo app = { .sType = VK_STRUCTURE_TYPE_APPLICATION_INFO };
app.apiVersion = VK_API_VERSION_1_3; // Vulkan 1.3, feature di sincronizzazione dinamica

VkInstanceCreateInfo ici = { .sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO };
ici.pApplicationInfo = &app;
VkInstance instance;
vkCreateInstance(&ici, NULL, &instance);
```

Ogni struct in Vulkan ha `sType` e `pNext`: la prima identifica il tipo, il secondo concatena estensioni strutturali. Dimenticare `sType` è l'errore più frequente per chi arriva da OpenGL.

| Oggetto | Ruolo | Creato con |
| --- | --- | --- |
| `VkInstance` | contesto dell'applicazione e dei layer | `vkCreateInstance` |
| `VkSurfaceKHR` | legame tra device e finestra | `vkCreateXlibSurfaceKHR`, `vkCreateWin32SurfaceKHR` |
| `VkPhysicalDevice` | GPU effettiva | enumerazione |
| `VkDevice` | device logico e code | `vkCreateDevice` |
| `VkSwapchainKHR` | immagini presentate alla finestra | `vkCreateSwapchainKHR` |

## Code e sincronizzazione

Vulkan espone le family di code del driver: ogni family può supportare grafica, compute, trasferimento, sparso, presentazione. Le code vanno create e sincronizzate. Il modello si appoggia a due primitive: i **semafori** proteggono gli acquire e present, le **barriere** proteggono le fasi della pipeline.

| Primitive | Dominio | Uso tipico |
| --- | --- | --- |
| `VkSemaphore` | GPU-GPU, tra code e tra swapchain | attendere che l'immagine sia pronta |
| `VkFence` | GPU-CPU | sapere quando il frame può essere riusato |
| barrier | dentro un command buffer | rendere visibili scritture successive |

Nelle versioni moderne la sincronizzazione dinamica (`vkCmdPipelineBarrier2`) è il modo consigliato: Vulkan 1.3 la porta nell'API core, dopo la promozione di `VK_KHR_synchronization2`.

## Un frame in Vulkan 1.3

Il frame è esplicito, nessuna chiamata implicita di "begin frame": si attendono i fence dei frame in volo, si acquisisce l'immagine, si registrano i comandi, si sottomette e si presenta. Il modello a due o tre frame in volo è la base: un array di command buffer, semafori e fence per frame. Ogni risorsa usata da un frame in volo non può essere modificata finché il fence di quel frame non è segnalato.

## Cosa Vulkan non fa per te

| Funzione assente | Dove la trovi |
| --- | --- |
| gestione della memoria (allocator) | Vulkan Memory Allocator (VMA) |
| caricamento di finestre e input | GLFW, SDL3 |
| compilazione GLSL verso SPIR-V | glslangValidator, compilatore integrato |
| validazione degli errori | validation layer, attivati in debug |
| astrazione del device | motori come Godot, oppure un piccolo wrapper tuo |

Questo è il motivo per cui i tutorial di Vulkan non iniziano con un triangolo: il primo triangolo richiede circa mille righe tra instance, swapchain, render pass, pipeline e command buffer.

## Errori comuni

- Chiamare funzioni senza `sType`: la validazione segnala `VUID-...-sType` e il driver può comportarsi in modo indefinito.
- Assumere un solo device: su un portatile con iGPU e dGPU l'ordine di enumerazione cambia.
- Condividere risorse senza barrieri: su alcune GPU l'app funziona, su altre mostra artefatti.
- Distruggere un oggetto usato da un comando in volo: crash o corruzione silenziosa; serve `vkDeviceWaitIdle` o il fence.
- Ignorare `VK_ERROR_OUT_OF_DATE_KHR`: la finestra ridimensionata congela l'immagine.
- Costruire le pipeline su ogni frame: `VkPipeline` è costoso, si crea una volta e si riusa.
- Trattare Vulkan come OpenGL con un altro nome: il driver non corregge errori e non sincronizza al posto tuo.

## In sintesi

Vulkan scambia la comodità con il controllo: tutto è un oggetto esplicito, la sincronizzazione è dichiarata, la memoria è allocata con un allocator. La catena instance, surface, physical device, device, swapchain, command buffer è la spina dorsale di ogni applicazione. Il frame si compone di fence, acquire, submit, present, con la ricostruzione della swapchain come caso normale. Gli strumenti che rendono il lavoro possibile — VMA, validation layer, sincronizzazione dinamica — sono parte del modello metodologico, non un'aggiunta.
