# Все текстуры игры: номер, имя файла, что это, формат, промпт для генерации.
# Из этого списка собираются задание CLAUDE_CHROME_TEXTURES.md (tools/build-texture-doc.py)
# и bundle.js (tools/pack-textures.py). Новые текстуры — только в конец: номера не сдвигаются.
# kind: seamless — бесшовная, front — вид строго спереди на весь кадр, alpha — вырезка на пурпурном фоне.
# px — до какой стороны ужимать при упаковке.

SEAMLESS = ('Seamless tileable texture for a realistic 3D open-world crime game set in modern Tel Aviv, '
            'orthographic straight-on view of a flat surface that fills the entire square edge to edge, '
            'even soft daylight, no perspective, no vignette, no shadows cast by objects, no objects, '
            'no text, no logos, no watermark. Realistic but slightly stylized colors, PS2-era game texture quality, '
            'readable at small size. ')
FRONT = ('Strictly orthographic front view (like an architectural elevation) for a realistic 3D open-world '
         'crime game set in modern Tel Aviv, the object fills the entire frame edge to edge with no background '
         'and no wall around it, even soft daylight, no perspective, no shadows, no watermark. ')
ALPHA = ('Game sprite texture for a realistic 3D open-world game set in Tel Aviv, the object isolated on a solid '
         'flat pure magenta background (#FF00FF) with no shadow and no gradient, crisp edges, '
         'even soft daylight, no text, no watermark. ')

TEXTURES = []


def t(name, title, prompt, kind='seamless', px=512, aspect='1:1', alpha=False, group='Фасады'):
    pre = {'seamless': SEAMLESS, 'front': FRONT, 'alpha': ALPHA}[kind]
    TEXTURES.append({'n': len(TEXTURES) + 1, 'name': name, 'title': title, 'prompt': pre + prompt, 'kind': kind,
                     'px': px, 'aspect': aspect, 'alpha': alpha or kind == 'alpha', 'group': group})


# ---------------------------------------------------------------- 1. штукатурка и облицовка фасадов
t('pl_white', 'Белая штукатурка (баухауз «Белого города»)',
  'Smooth white lime plaster wall of a 1930s Bauhaus apartment building in Tel Aviv, faint hairline cracks, '
  'subtle sun-bleached patches and very light grey dust streaks, fine sand grain.')
t('pl_cream', 'Кремовая штукатурка',
  'Warm cream-coloured plaster wall of an old Tel Aviv apartment building, slightly uneven, faint water stains, fine grain.')
t('pl_pink', 'Пастельно-розовая штукатурка',
  'Pastel pink plaster wall of a renovated Bauhaus building in Tel Aviv, soft faded tone, fine grain, light weathering.')
t('pl_blue', 'Серо-голубая штукатурка',
  'Pale grey-blue plaster wall of an eclectic 1920s house in Neve Tzedek, chalky texture, a few small chips.')
t('pl_beige', 'Бежевая штукатурка 1960-х («шприц»)',
  'Beige rough sprayed stucco ("shpritz") wall of a 1960s Israeli apartment block, coarse pebbly texture, grime streaks under where windows would be.')
t('pl_grey', 'Серая штукатурка 1960-х',
  'Grey rough sprayed concrete stucco wall of a 1960s Tel Aviv shikun building, coarse texture, dark rain streaks and patches of newer paint.')
t('pl_ochre', 'Охристая штукатурка (эклектика)',
  'Ochre yellow plaster wall of a 1920s eclectic building in Florentin, Tel Aviv, sun-faded, small cracks, slightly patchy repairs.')
t('pl_salmon', 'Лососевая штукатурка',
  'Salmon orange-pink plaster wall of an old Tel Aviv building, warm Mediterranean tone, faded and slightly peeling in small spots.')
t('pl_mint', 'Мятная штукатурка',
  'Pale mint green plaster wall of a restored Bauhaus building, smooth, fine grain, very light weathering.')
t('jstone', 'Иерусалимский камень (облицовка)',
  'Cladding of cut Jerusalem limestone blocks on a 1980s Israeli apartment building, warm cream-yellow stones of '
  'slightly different shades laid in a regular running bond, thin mortar joints, chiselled surface.')
t('trim', 'Светлый карниз / наличник',
  'Smooth light cream painted concrete trim of a building cornice, very subtle texture, slightly dusty.')
t('concrete', 'Бетон',
  'Exposed grey concrete of an Israeli building, visible formwork board lines, small air holes, light stains.')
t('mosaic', 'Мозаика 1960-х (цоколь, балконы)',
  'Small square ceramic mosaic tiles 2 cm in brown, beige and dark red mix, typical 1960s Israeli balcony parapet, grout lines.')
t('cladding', 'Тёмные фасадные панели (надстройка ТАМА-38)',
  'Modern dark grey fibre-cement facade panels with thin vertical joints, matte, of a new rooftop extension on an old building.')
t('wall_tiles', 'Белая плитка лобби',
  'Glossy white rectangular ceramic wall tiles of an apartment building lobby, grey grout, slight reflections.')
t('graffiti', 'Граффити на бетоне',
  'Colourful street graffiti tags and throw-ups covering a grey concrete wall in Florentin, Tel Aviv, layered paint, '
  'no readable words, abstract letter shapes only.')
t('metal', 'Металлические панели',
  'Grey painted sheet metal panels with rivets and small rust spots.')
t('trisim', 'Ставни-«трисим» (рулонные)',
  'Closed Israeli roller shutter ("trisol") made of horizontal white-beige plastic slats, slight dirt in the grooves, '
  'small light gaps between slats.')
t('wood_old', 'Старая деревянная дверь',
  'Weathered painted wooden planks of an old door, peeling turquoise-green paint showing grey wood underneath.')
t('glass_dark', 'Тёмное стекло фасада',
  'Dark reflective glass curtain wall, thin black mullions in a grid, faint sky reflections.')
t('glass_blue', 'Голубое стекло (перила, шахта лифта)',
  'Light blue-green tempered glass panels with thin metal frames, transparent look with soft reflections.')
t('solar_panel', 'Панель солнечного бойлера',
  'Top view of an Israeli rooftop solar water heater collector panel: dark blue glass over black absorber with thin '
  'vertical copper pipes, aluminium frame edge, a little dust.')
t('awning_red', 'Маркиза: красная полоса',
  'Canvas shop awning fabric with wide vertical red and white stripes, slightly faded by sun, fabric weave.')
t('awning_green', 'Маркиза: зелёная полоса',
  'Canvas shop awning fabric with wide vertical dark green and cream stripes, slightly faded, fabric weave.')
t('awning_blue', 'Маркиза: синяя',
  'Plain navy blue canvas shop awning fabric, sun-faded, fabric weave, a few dust streaks.')
t('roof_flat', 'Плоская крыша (светлое покрытие)',
  'Top view of a flat Tel Aviv rooftop covered with white reflective waterproof coating, patches, cracks, dirt streaks around drains.')
t('roof_tar', 'Плоская крыша (битум, гравий)',
  'Top view of an old flat rooftop covered with black bitumen and grey gravel, patches of repair.')
t('roof_tiles', 'Красная черепица',
  'Top view of terracotta clay roof tiles in rows, Mediterranean style, slight moss and dirt.')
t('railing', 'Решётка перил',
  'Simple black painted steel balcony railing bars, vertical bars with a top rail, seen straight on against a pale wall.')

# ---------------------------------------------------------------- 2. окна (атлас собирает игра)
W = 'A single window of a Tel Aviv apartment building, the window frame touches all four edges of the image. '
t('win_alu', 'Окно: алюминиевое раздвижное', W + 'White aluminium sliding window with two panes, dark glass reflecting the sky, '
  'thin horizontal mosquito net on one half.', kind='front', group='Окна', px=256)
t('win_trisHalf', 'Окно: трисим наполовину опущен', W + 'Aluminium window with a beige plastic roller shutter pulled half way down, '
  'dark glass visible in the lower half.', kind='front', group='Окна', px=256)
t('win_trisShut', 'Окно: трисим закрыт', W + 'Fully closed beige plastic roller shutter covering the whole window, slats with small light gaps.',
  kind='front', group='Окна', px=256)
t('win_shutterG', 'Окно: зелёные деревянные ставни', W + 'Tall window with closed old green wooden louvred shutters, '
  'peeling paint, eclectic 1920s style.', kind='front', group='Окна', px=256, aspect='2:3')
t('win_modern', 'Окно: современное стекло', W + 'Large modern floor-to-ceiling window with a thin black frame, dark grey glass with a reflection of palm trees.',
  kind='front', group='Окна', px=256)
t('win_curtain', 'Окно: с занавеской', W + 'Old wooden window open slightly, a light patterned curtain inside, potted plant on the sill.',
  kind='front', group='Окна', px=256)
t('win_door', 'Балконная дверь / вход', W + 'Glass balcony door with aluminium frame, curtains half drawn inside.',
  kind='front', group='Окна', px=256, aspect='2:3')
t('win_blinds', 'Окно: ленточное с жалюзи', W + 'Wide horizontal ribbon window of a Bauhaus building with white venetian blinds half closed.',
  kind='front', group='Окна', px=256, aspect='3:2')

# ---------------------------------------------------------------- 3. лавки и вывески (есть из «ХАМСИНа»)
for i, s in enumerate(['makolet (mini-market) with crates of fruit and a fridge of drinks, hand-written price signs',
                       'pizzeria with a counter and pizza slices in a glass display',
                       'shawarma stand with a rotating meat spit and salads in a glass counter',
                       'falafel kiosk with a green-white striped awning and a counter with salads',
                       'Russian grocery "gastronom" with sausages and pickles in the window',
                       'barber shop with a striped pole and a big mirror inside',
                       'mobile phone repair shop covered with cluttered colourful stickers',
                       'closed shop with a dusty grey metal roller shutter and a "for rent" sign']):
    t(f'shop_{i + 1}', f'Витрина лавки {i + 1}', 'Ground floor shop front of an old Tel Aviv building: ' + s +
      ', shop sign above the door in Hebrew letters, door and shop window, framed by plaster wall edges.',
      kind='front', group='Лавки и вывески', px=768, aspect='16:9')
for i, s in enumerate(['delivery scooter rider on a sunny beach road', 'hummus plate with pita, food advertisement',
                       'family on a sofa, home appliance advertisement', 'Hebrew language school (ulpan) classroom',
                       'falling gold coins, lottery advertisement', 'sunset over a new residential tower, real estate ad',
                       'smartphone with colourful apps, mobile operator ad', 'ice cream cone under the sun, summer ad']):
    t(f'sign_{i + 1}', f'Рекламный щит {i + 1}', 'Billboard poster illustration, flat bright advertising art, no letters: ' + s + '.',
      kind='front', group='Лавки и вывески', px=768, aspect='16:9')

# ---------------------------------------------------------------- 4. улица и земля
G = 'Улица и земля'
t('asphalt', 'Асфальт', 'Top view of worn dark grey city asphalt road surface, fine aggregate, small cracks, oil stains, patched areas.', group=G)
t('sidewalk', 'Тротуарная плитка Тель-Авива', 'Top view of a Tel Aviv sidewalk paved with square grey concrete tiles 20x20 cm, '
  'a few tiles in reddish colour, worn, small cracks, dirt in the joints.', group=G)
t('curb_bw', 'Бордюр: сине-белый (платная парковка)', 'Side view of a concrete street curb painted in alternating blue and white '
  'stripes, each stripe about 1 meter long, worn paint. The curb fills the whole image horizontally.', group=G, aspect='4:1')
t('curb_rw', 'Бордюр: красно-белый (стоянка запрещена)', 'Side view of a concrete street curb painted in alternating red and white '
  'stripes, each stripe about 1 meter long, worn paint. The curb fills the whole image horizontally.', group=G, aspect='4:1')
t('grass', 'Газон', 'Top view of a slightly dry city lawn, green and yellow grass patches, Mediterranean summer.', group=G)
t('dirt', 'Сухая земля с травой', 'Top view of dry sandy soil with sparse dry grass and small pebbles, Mediterranean city backyard.', group=G)
t('sand', 'Песок пляжа', 'Top view of light golden beach sand with soft footprints and ripples.', group=G)
t('sea', 'Море', 'Top view of turquoise Mediterranean sea water with small waves and sun glints.', group=G)
t('plaza', 'Плитка бульвара', 'Top view of a boulevard promenade paved with light beige stone slabs in a running pattern.', group=G)
t('deck', 'Деревянный настил', 'Top view of weathered wooden deck boards of a seaside promenade.', group=G)
t('hedge', 'Живая изгородь', 'Dense trimmed green ficus hedge leaves, side view, filling the whole square.', group=G)
t('bark', 'Кора фикуса', 'Smooth grey bark of an old ficus tree with vertical folds, side view.', group=G)
t('palm_bark', 'Ствол пальмы', 'Trunk of a Washingtonia palm with diamond pattern of old leaf bases, side view.', group=G)

# ---------------------------------------------------------------- 5. деревья (вырезка)
V = 'Растения'
t('palm_frond', 'Лист пальмы (вырезка)', 'A single long green feather palm frond seen from above, from stem at the left edge '
  'to tip at the right edge.', kind='alpha', group=V, aspect='2:1')
t('leaves', 'Крона фикуса (вырезка)', 'A dense cluster of glossy dark green ficus leaves, roughly round blob shape with leafy edges.',
  kind='alpha', group=V)
# ---------------------------------------------------------------- 6. машины
C = 'Машины'
t('car_headlight', 'Фара', 'A modern car headlight unit, chrome reflectors and clear lens with LED strip, the headlight fills the whole frame.',
  kind='front', group=C, px=256, aspect='3:1')
t('car_taillight', 'Задний фонарь', 'A modern car tail light unit, red and orange sections with clear reverse light, fills the whole frame.',
  kind='front', group=C, px=256, aspect='3:1')
t('car_grille', 'Решётка радиатора', 'Black plastic honeycomb car radiator grille, fills the whole frame, no logo.',
  kind='front', group=C, px=256, aspect='3:1')
t('car_plate_il', 'Израильский номер', 'Israeli car license plate: yellow rectangle with black digits like "12-345-67", '
  'small blue strip on the left with "IL", fills the whole frame.', kind='front', group=C, px=256, aspect='4:1')
t('car_taxi_sign', 'Шашка такси', 'Yellow Israeli taxi roof sign with the black Hebrew word "מונית", fills the whole frame.',
  kind='front', group=C, px=256, aspect='3:1')
t('car_rim', 'Колёсный диск', 'Silver 5-spoke alloy car wheel rim seen straight on, centred, circle touching the image edges, '
  'dark gaps between spokes showing a brake disc.', kind='front', group=C, px=256)

# ---------------------------------------------------------------- 7. прочее
O = 'Прочее'
t('kiosk', 'Киоск на бульваре (фасад)', 'Front of a small kiosk on Rothschild boulevard: counter window with snacks, drinks, newspapers, '
  'Hebrew sign, awning, the kiosk fills the frame.', kind='front', group=O, px=512, aspect='3:2')
