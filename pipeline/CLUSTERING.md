# Clustering: Arquitectura y decisiones

## Problema original

El clustering procesaba 485 artículos en batches de 100 con Haiku. Cada batch generaba story_ids independientes, fragmentando la misma historia en 15+ clusters (max 3 fuentes). Resultado: solo 7 artículos finales de 485 raw articles.

## Solución: Pipeline de 4 fases

### Fase 1 — Dedup intra-fuente (`deduplicatePerSource`)
- **Qué hace**: Para cada medio, agrupa sus artículos que cubren el mismo acontecimiento
- **Cómo**: Una llamada Haiku por fuente (12 llamadas, concurrency 7)
- **Resultado**: ~415 representantes de 485 artículos + `siblingsMap` para expandir después
- **Prompt**: Agresivo dentro de fuente — noticia, opinión, crónica del mismo hecho van juntas
- **Reducción típica**: ~15% (medios grandes publican muchos artículos genuinamente distintos)

### Fase 2 — Clustering global (`clusterGlobal`)
- **Qué hace**: Agrupa representantes de distintos medios que cubren el mismo acontecimiento
- **Cómo**: Llamadas Haiku con max 200 reps por llamada (límite por output tokens de Haiku: 8192)
- **Distribución round-robin**: Los artículos se reparten por fuente alternando entre llamadas, para que cada llamada vea todos los medios
- **Prompt**: Estricto — mismo acontecimiento concreto, no tema genérico. Test: "¿Podrías escribir UN SOLO artículo que cubriera ambos sin cambiar de tema?"
- **Story_ids**: Siempre en español, kebab-case

### Fase 3 — Merge de duplicados (`mergeDuplicateClusters`) [LLM]
- **Qué hace**: Detecta clusters que son el mismo acontecimiento con story_ids distintos (fragmentación de fase 2 por split en varias llamadas)
- **Cómo**: Una llamada Haiku con todos los clusters multi-artículo + singletons que comparten keywords con algún multi-cluster
- **Prompt**: Muy estricto — solo fusiona si titulares describen LITERALMENTE los mismos hechos
- **Union-find**: El LLM puede devolver merges por pares (A+B, A+C). Se consolidan en grupos transitivos (A+B+C) con union-find antes de aplicar
- **Atrapa**: `ataque-iran-eeuu-israel` + `iran-ataque-eeuu-israel` + `conflicto-iran-eeuu-israel`

### Fase 4 — Rescue (`rescueSingleSourceClusters`) [LLM]
- **Qué hace**: Toma clusters de 1 sola fuente con 2+ artículos e intenta asignarlos a clusters multi-fuente existentes
- **Cómo**: Una llamada Haiku. Muestra los orphans (1 fuente) y los targets (multi-fuente), pide asignaciones
- **Prompt**: Estricto — solo asignar si cubren LITERALMENTE el mismo acontecimiento

## Flujo completo en `clusterEdition()`

```
1. Load raw_articles + sourceMap
2. deduplicatePerSource()         → representantes + siblingsMap
3. clusterGlobal()                → clusters de representantes (2-3 llamadas Haiku, round-robin)
4. expandClusters()               → clusters con todos los artículos
5. mergeDuplicateClusters()       → fusiona duplicados (1 llamada Haiku + union-find)
6. rescueSingleSourceClusters()   → rescata orphans a clusters multi-fuente (1 llamada Haiku)
7. Orphans → clusters individuales
8. Store en DB (crear/enriquecer clusters)
```

## Resultados

| Métrica | v1 (batched) | v5 (5 fases) | v7 (actual) |
|---|---|---|---|
| Max fuentes en 1 cluster | 3 | 8-9 | 10 |
| Clusters con ≥2 fuentes | ~7 | ~19 | 15 |
| Llamadas Haiku | 5 batches | ~17 | ~17 (12 dedup + 3 global + 1 merge + 1 rescue) |
| Tiempo | ~15s | ~50s | ~31s |

## Problemas conocidos y mejoras pendientes

### Fase 1 poco efectiva con medios grandes
- El País 75 → 68 (-9%), 20 Minutos 99 → 90 (-9%)
- Medios grandes publican muchos artículos genuinamente distintos
- **Posible mejora**: Pasar más contexto (URL, categoría RSS) al prompt de dedup

### Fase 2 limitada por output tokens de Haiku (8192)
- Con 400+ reps se parte en 2-3 llamadas → fragmentación parcial que la fase 3 compensa
- 200 reps × ~30 tokens/cluster output ≈ 6000 tokens, cabe ajustado
- **Posible mejora**: Usar Sonnet (16k output) para la fase 2 — más caro pero una sola llamada
- **Posible mejora**: Mejorar fase 1 para bajar a <200 reps → una sola llamada Haiku

### Mega-eventos fragmentados (MWC, Goya)
- Eventos con 5+ ángulos distintos generan clusters separados que no se fusionan del todo
- La rescue puede rescatar algunos
- **Posible mejora**: Detectar "mega-eventos" por frecuencia de keywords en títulos

## Historial de iteraciones

### v1 — Batched (original)
- 5 batches de 100, concurrency 5
- Resultado: 7 artículos, max 3 fuentes
- Problema: Haiku genera story_ids distintos en cada batch

### v2 — Dos fases sin merge
- Fase 1 dedup + Fase 2 global
- Resultado: 22 clusters multi-source, pero Irán fragmentado en 2 (split por >300 reps)
- 110 unassigned cuando se forzó 1 sola llamada (output truncado)

### v3 — Con merge LLM permisivo
- Añadida fase 3b con merge de duplicados
- Prompt demasiado permisivo → falsos positivos (tiroteo+narco, tenis+cine)

### v4 — Merge estricto + keyword merge
- Merge LLM endurecido (solo duplicados literales)
- Añadida fase 3c determinista por keywords con stop words manuales
- Problema: keyword merge juntó cosas por lugar (castilla-leon) y genéricos (video-falso, inteligencia-artificial)

### v5 — Validación + rescue
- Validación post-merge LLM: rechaza merges si story_ids no comparten keywords
- Añadida fase 4 (rescue): rescata clusters de 1 fuente a multi-fuente
- **Resultado**: ~19 clusters multi-source, Irán 9 fuentes, Zapatero 8 fuentes

### v6 — Round-robin + merge transitivo
- Round-robin split en fase 2 (cada llamada ve todos los medios)
- Union-find en merge LLM (consolida merges por pares en grupos transitivos)
- Story_ids forzados en español
- **Resultado**: 27 clusters multi-source, pero con falsos positivos del keyword merge

### v7 — Eliminada fase determinista (actual)
- **Eliminada fase 3c** (merge por keywords con stop words): frágil, requería mantenimiento manual constante, causaba falsos positivos
- **Merge LLM ampliado**: Ahora incluye singletons que comparten keywords con clusters multi-artículo, no solo clusters multi-artículo. Esto cubre los casos que antes pillaba la fase determinista (borrasca-regina, cristina-herrero, etc.)
- **Resultado**: 15 clusters multi-source, 0 falsos positivos, Irán 10 fuentes, Zapatero 8 fuentes, Borrasca 5 fuentes
- Pipeline 100% basado en LLM (excepto expansión de siblings), sin lógica determinista frágil
