# Задание для Claude в Chrome: все текстуры игры «ХАМСИН 3D — Тель-Авив»

> Откройте этот файл в боковой панели **Claude в Chrome** и скажите:
> «Выполни задание из этого файла».
> Здесь все текстуры 3D-квартала: штукатурка и камень домов, окна, витрины лавок,
> асфальт и тротуары, деревья, детали машин. Пока картинки нет, игра рисует похожую
> текстуру сама, так что картинки можно добавлять частями.

Всего: **75** картинок.

## Сначала — одна картинка на согласование

1. Сгенерируй **только № 1** (`pl_white.png`).
2. Покажи её пользователю и спроси: «Так подходит? Продолжать?»
3. **Дальше не иди, пока пользователь не ответит «да».** Если он просит поправить —
   допиши его уточнение в конец промпта, сгенерируй заново и снова спроси. Потом добавляй
   это же уточнение к похожим пунктам списка.
4. После «да» — весь список по порядку.

## Главное правило: имя файла

Каждую скачанную картинку **назови по номеру и имени из заголовка пункта**, например
`1_pl_white.png`. Если браузер не даёт переименовать — запиши в отчёт, какой скачанный
файл какому номеру соответствует. Лишние варианты не скачивай.

## Как работать в Google Flow (или Gemini)

1. Открой https://labs.google/fx/tools/flow. Если нужен вход в аккаунт Google — попроси
   пользователя войти и продолжай после этого. (Если Flow недоступен — https://gemini.google.com.)
2. Создай проект «ХАМСИН 3D текстуры» и переключись на **генерацию изображений**,
   1 результат на запрос, формат — как указано у пункта.
3. Вставь промпт из блока кода **целиком** и запусти.
4. Проверь по чек-листу. Не подходит — сгенерируй ещё раз или допиши уточнение в конец
   (например, «strictly orthographic, flat, seamless edges»).
5. Скачай удачную картинку в полном размере, **PNG или JPG** (не WebP), и переходи к следующей.

### Чек-лист

- **Бесшовные** текстуры (большинство): узор продолжается через края, нет рамки, нет
  предмета в центре, нет виньетки и пятна света, нет перспективы — плоская поверхность.
- **Окна, витрины, щиты, детали машин**: строго спереди, предмет заполняет весь кадр до краёв.
- **Вырезки** (листья, пальма): предмет на сплошном пурпурном фоне `#FF00FF` без теней.
- Нигде нет водяных знаков и логотипов. Буквы — только там, где промпт их просит
  (вывески лавок на иврите, шашка такси, номер машины).

### Отчёт в конце

Напиши пользователю, какие номера готовы, какие пропущены и (если не получилось
переименовать) какой файл к какому номеру. Файлы пусть загрузит в **новую** папку
Google Диска (например, «ХАМСИН 3D — текстуры») — Claude Code сам разложит их по местам:
`python3 tools/pack-textures.py <папка с картинками>`.

---

## Фасады

### 1. `pl_white.png` — Белая штукатурка (баухауз «Белого города»)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Smooth white lime plaster wall of a 1930s Bauhaus apartment building in Tel Aviv, faint hairline cracks, subtle sun-bleached patches and very light grey dust streaks, fine sand grain.
```

### 2. `pl_cream.png` — Кремовая штукатурка

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Warm cream-coloured plaster wall of an old Tel Aviv apartment building, slightly uneven, faint water stains, fine grain.
```

### 3. `pl_pink.png` — Пастельно-розовая штукатурка

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Pastel pink plaster wall of a renovated Bauhaus building in Tel Aviv, soft faded tone, fine grain, light weathering.
```

### 4. `pl_blue.png` — Серо-голубая штукатурка

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Pale grey-blue plaster wall of an eclectic 1920s house in Neve Tzedek, chalky texture, a few small chips.
```

### 5. `pl_beige.png` — Бежевая штукатурка 1960-х («шприц»)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Beige rough sprayed stucco ("shpritz") wall of a 1960s Israeli apartment block, coarse pebbly texture, grime streaks under where windows would be.
```

### 6. `pl_grey.png` — Серая штукатурка 1960-х

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Grey rough sprayed concrete stucco wall of a 1960s Tel Aviv shikun building, coarse texture, dark rain streaks and patches of newer paint.
```

### 7. `pl_ochre.png` — Охристая штукатурка (эклектика)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Ochre yellow plaster wall of a 1920s eclectic building in Florentin, Tel Aviv, sun-faded, small cracks, slightly patchy repairs.
```

### 8. `pl_salmon.png` — Лососевая штукатурка

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Salmon orange-pink plaster wall of an old Tel Aviv building, warm Mediterranean tone, faded and slightly peeling in small spots.
```

### 9. `pl_mint.png` — Мятная штукатурка

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Pale mint green plaster wall of a restored Bauhaus building, smooth, fine grain, very light weathering.
```

### 10. `jstone.png` — Иерусалимский камень (облицовка)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Cladding of cut Jerusalem limestone blocks on a 1980s Israeli apartment building, warm cream-yellow stones of slightly different shades laid in a regular running bond, thin mortar joints, chiselled surface.
```

### 11. `trim.png` — Светлый карниз / наличник

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Smooth light cream painted concrete trim of a building cornice, very subtle texture, slightly dusty.
```

### 12. `concrete.png` — Бетон

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Exposed grey concrete of an Israeli building, visible formwork board lines, small air holes, light stains.
```

### 13. `mosaic.png` — Мозаика 1960-х (цоколь, балконы)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Small square ceramic mosaic tiles 2 cm in brown, beige and dark red mix, typical 1960s Israeli balcony parapet, grout lines.
```

### 14. `cladding.png` — Тёмные фасадные панели (надстройка ТАМА-38)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Modern dark grey fibre-cement facade panels with thin vertical joints, matte, of a new rooftop extension on an old building.
```

### 15. `wall_tiles.png` — Белая плитка лобби

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Glossy white rectangular ceramic wall tiles of an apartment building lobby, grey grout, slight reflections.
```

### 16. `graffiti.png` — Граффити на бетоне

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Colourful street graffiti tags and throw-ups covering a grey concrete wall in Florentin, Tel Aviv, layered paint, no readable words, abstract letter shapes only.
```

### 17. `metal.png` — Металлические панели

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Grey painted sheet metal panels with rivets and small rust spots.
```

### 18. `trisim.png` — Ставни-«трисим» (рулонные)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Closed Israeli roller shutter ("trisol") made of horizontal white-beige plastic slats, slight dirt in the grooves, small light gaps between slats.
```

### 19. `wood_old.png` — Старая деревянная дверь

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Weathered painted wooden planks of an old door, peeling turquoise-green paint showing grey wood underneath.
```

### 20. `glass_dark.png` — Тёмное стекло фасада

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Dark reflective glass curtain wall, thin black mullions in a grid, faint sky reflections.
```

### 21. `glass_blue.png` — Голубое стекло (перила, шахта лифта)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Light blue-green tempered glass panels with thin metal frames, transparent look with soft reflections.
```

### 22. `solar_panel.png` — Панель солнечного бойлера

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of an Israeli rooftop solar water heater collector panel: dark blue glass over black absorber with thin vertical copper pipes, aluminium frame edge, a little dust.
```

### 23. `awning_red.png` — Маркиза: красная полоса

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Canvas shop awning fabric with wide vertical red and white stripes, slightly faded by sun, fabric weave.
```

### 24. `awning_green.png` — Маркиза: зелёная полоса

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Canvas shop awning fabric with wide vertical dark green and cream stripes, slightly faded, fabric weave.
```

### 25. `awning_blue.png` — Маркиза: синяя

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Plain navy blue canvas shop awning fabric, sun-faded, fabric weave, a few dust streaks.
```

### 26. `roof_flat.png` — Плоская крыша (светлое покрытие)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of a flat Tel Aviv rooftop covered with white reflective waterproof coating, patches, cracks, dirt streaks around drains.
```

### 27. `roof_tar.png` — Плоская крыша (битум, гравий)

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of an old flat rooftop covered with black bitumen and grey gravel, patches of repair.
```

### 28. `roof_tiles.png` — Красная черепица

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of terracotta clay roof tiles in rows, Mediterranean style, slight moss and dirt.
```

### 29. `railing.png` — Решётка перил

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Simple black painted steel balcony railing bars, vertical bars with a top rail, seen straight on against a pale wall.
```

## Окна

### 30. `win_alu.png` — Окно: алюминиевое раздвижное

- [ ] Формат 1:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. White aluminium sliding window with two panes, dark glass reflecting the sky, thin horizontal mosquito net on one half.
```

### 31. `win_trisHalf.png` — Окно: трисим наполовину опущен

- [ ] Формат 1:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. Aluminium window with a beige plastic roller shutter pulled half way down, dark glass visible in the lower half.
```

### 32. `win_trisShut.png` — Окно: трисим закрыт

- [ ] Формат 1:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. Fully closed beige plastic roller shutter covering the whole window, slats with small light gaps.
```

### 33. `win_shutterG.png` — Окно: зелёные деревянные ставни

- [ ] Формат 2:3; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. Tall window with closed old green wooden louvred shutters, peeling paint, eclectic 1920s style.
```

### 34. `win_modern.png` — Окно: современное стекло

- [ ] Формат 1:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. Large modern floor-to-ceiling window with a thin black frame, dark grey glass with a reflection of palm trees.
```

### 35. `win_curtain.png` — Окно: с занавеской

- [ ] Формат 1:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. Old wooden window open slightly, a light patterned curtain inside, potted plant on the sill.
```

### 36. `win_door.png` — Балконная дверь / вход

- [ ] Формат 2:3; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. Glass balcony door with aluminium frame, curtains half drawn inside.
```

### 37. `win_blinds.png` — Окно: ленточное с жалюзи

- [ ] Формат 3:2; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. Wide horizontal ribbon window of a Bauhaus building with white venetian blinds half closed.
```

## Лавки и вывески

### 38. `shop_1.png` — Витрина лавки 1

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Ground floor shop front of an old Tel Aviv building: makolet (mini-market) with crates of fruit and a fridge of drinks, hand-written price signs, shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.
```

### 39. `shop_2.png` — Витрина лавки 2

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Ground floor shop front of an old Tel Aviv building: pizzeria with a counter and pizza slices in a glass display, shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.
```

### 40. `shop_3.png` — Витрина лавки 3

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Ground floor shop front of an old Tel Aviv building: shawarma stand with a rotating meat spit and salads in a glass counter, shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.
```

### 41. `shop_4.png` — Витрина лавки 4

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Ground floor shop front of an old Tel Aviv building: falafel kiosk with a green-white striped awning and a counter with salads, shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.
```

### 42. `shop_5.png` — Витрина лавки 5

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Ground floor shop front of an old Tel Aviv building: Russian grocery "gastronom" with sausages and pickles in the window, shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.
```

### 43. `shop_6.png` — Витрина лавки 6

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Ground floor shop front of an old Tel Aviv building: barber shop with a striped pole and a big mirror inside, shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.
```

### 44. `shop_7.png` — Витрина лавки 7

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Ground floor shop front of an old Tel Aviv building: mobile phone repair shop covered with cluttered colourful stickers, shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.
```

### 45. `shop_8.png` — Витрина лавки 8

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Ground floor shop front of an old Tel Aviv building: closed shop with a dusty grey metal roller shutter and a "for rent" sign, shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.
```

### 46. `sign_1.png` — Рекламный щит 1

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Billboard poster illustration, flat bright advertising art, no letters: delivery scooter rider on a sunny beach road.
```

### 47. `sign_2.png` — Рекламный щит 2

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Billboard poster illustration, flat bright advertising art, no letters: hummus plate with pita, food advertisement.
```

### 48. `sign_3.png` — Рекламный щит 3

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Billboard poster illustration, flat bright advertising art, no letters: family on a sofa, home appliance advertisement.
```

### 49. `sign_4.png` — Рекламный щит 4

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Billboard poster illustration, flat bright advertising art, no letters: Hebrew language school (ulpan) classroom.
```

### 50. `sign_5.png` — Рекламный щит 5

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Billboard poster illustration, flat bright advertising art, no letters: falling gold coins, lottery advertisement.
```

### 51. `sign_6.png` — Рекламный щит 6

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Billboard poster illustration, flat bright advertising art, no letters: sunset over a new residential tower, real estate ad.
```

### 52. `sign_7.png` — Рекламный щит 7

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Billboard poster illustration, flat bright advertising art, no letters: smartphone with colourful apps, mobile operator ad.
```

### 53. `sign_8.png` — Рекламный щит 8

- [ ] Формат 16:9; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Billboard poster illustration, flat bright advertising art, no letters: ice cream cone under the sun, summer ad.
```

## Улица и земля

### 54. `asphalt.png` — Асфальт

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of worn dark grey city asphalt road surface, fine aggregate, small cracks, oil stains, patched areas.
```

### 55. `sidewalk.png` — Тротуарная плитка Тель-Авива

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of a Tel Aviv sidewalk paved with square grey concrete tiles 20x20 cm, a few tiles in reddish colour, worn, small cracks, dirt in the joints.
```

### 56. `curb_bw.png` — Бордюр: сине-белый (платная парковка)

- [ ] Формат 4:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Side view of a concrete street curb painted in alternating blue and white stripes, each stripe about 1 meter long, worn paint. The curb fills the whole image horizontally.
```

### 57. `curb_rw.png` — Бордюр: красно-белый (стоянка запрещена)

- [ ] Формат 4:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Side view of a concrete street curb painted in alternating red and white stripes, each stripe about 1 meter long, worn paint. The curb fills the whole image horizontally.
```

### 58. `grass.png` — Газон

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of a slightly dry city lawn, green and yellow grass patches, Mediterranean summer.
```

### 59. `dirt.png` — Сухая земля с травой

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of dry sandy soil with sparse dry grass and small pebbles, Mediterranean city backyard.
```

### 60. `sand.png` — Песок пляжа

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of light golden beach sand with soft footprints and ripples.
```

### 61. `sea.png` — Море

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of turquoise Mediterranean sea water with small waves and sun glints.
```

### 62. `plaza.png` — Плитка бульвара

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of a boulevard promenade paved with light beige stone slabs in a running pattern.
```

### 63. `deck.png` — Деревянный настил

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: есть (взята из GTA-original-2027 — можно сгенерировать заново в едином стиле).

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Top view of weathered wooden deck boards of a seaside promenade.
```

### 64. `hedge.png` — Живая изгородь

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Dense trimmed green ficus hedge leaves, side view, filling the whole square.
```

### 65. `bark.png` — Кора фикуса

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Smooth grey bark of an old ficus tree with vertical folds, side view.
```

### 66. `palm_bark.png` — Ствол пальмы

- [ ] Формат 1:1; бесшовная: левый край продолжает правый, верхний — нижний; без предмета в центре. Сейчас в игре: нет.

```
Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, orthographic straight-on view of a flat surface that fills the entire square edge to edge, even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, readable at small size. Trunk of a Washingtonia palm with diamond pattern of old leaf bases, side view.
```

## Растения

### 67. `palm_frond.png` — Лист пальмы (вырезка)

- [ ] Формат 2:1; предмет на сплошном пурпурном фоне #FF00FF (фон игра вырежет сама). Сейчас в игре: нет.

```
Game sprite texture for a realistic 3D open-world game set in Tel Aviv, the object isolated on a solid flat pure magenta background (#FF00FF) with no shadow and no gradient, crisp edges, even soft daylight, no text, no watermark. A single long green feather palm frond seen from above, from stem at the left edge to tip at the right edge.
```

### 68. `leaves.png` — Крона фикуса (вырезка)

- [ ] Формат 1:1; предмет на сплошном пурпурном фоне #FF00FF (фон игра вырежет сама). Сейчас в игре: нет.

```
Game sprite texture for a realistic 3D open-world game set in Tel Aviv, the object isolated on a solid flat pure magenta background (#FF00FF) with no shadow and no gradient, crisp edges, even soft daylight, no text, no watermark. A dense cluster of glossy dark green ficus leaves, roughly round blob shape with leafy edges.
```

## Машины

### 69. `car_headlight.png` — Фара

- [ ] Формат 3:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A modern car headlight unit, chrome reflectors and clear lens with LED strip, the headlight fills the whole frame.
```

### 70. `car_taillight.png` — Задний фонарь

- [ ] Формат 3:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. A modern car tail light unit, red and orange sections with clear reverse light, fills the whole frame.
```

### 71. `car_grille.png` — Решётка радиатора

- [ ] Формат 3:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Black plastic honeycomb car radiator grille, fills the whole frame, no logo.
```

### 72. `car_plate_il.png` — Израильский номер

- [ ] Формат 4:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Israeli car license plate: yellow rectangle with black digits like "12-345-67", small blue strip on the left with "IL", fills the whole frame.
```

### 73. `car_taxi_sign.png` — Шашка такси

- [ ] Формат 3:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Yellow Israeli taxi roof sign with the black Hebrew word "מונית", fills the whole frame.
```

### 74. `car_rim.png` — Колёсный диск

- [ ] Формат 1:1; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Silver 5-spoke alloy car wheel rim seen straight on, centred, circle touching the image edges, dark gaps between spokes showing a brake disc.
```

## Прочее

### 75. `kiosk.png` — Киоск на бульваре (фасад)

- [ ] Формат 3:2; вид строго спереди, как чертёж; предмет на весь кадр, без фона и перспективы. Сейчас в игре: нет.

```
Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background and no wall around it, even soft daylight, no perspective, no shadows, no watermark. Front of a small kiosk on Rothschild boulevard: counter window with snacks, drinks, newspapers, Hebrew sign, awning, the kiosk fills the frame.
```
