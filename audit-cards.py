#!/usr/bin/env python3
"""Automated editorial lint for the Nocturne Tarot card database; not expert certification."""
import json, re, collections, sys
from pathlib import Path
root=Path(__file__).parent
cards=json.loads((root/'cards.json').read_text(encoding='utf-8'))
errors=[]; warnings=[]
required=['id','name','arcana','symbols','core','relationships','thoughts','actions','work','obstacles','result','positive','shadow','limits','source','version','updated']
if len(cards)!=78: errors.append(f'Ожидалось 78 карт, найдено {len(cards)}')
for i,c in enumerate(cards):
 for k in required:
  if k not in c or c[k] in (None,'',[]): errors.append(f'{c.get("name",i)}: отсутствует обязательное поле {k}')
 for k in ['core','relationships','thoughts','actions','work','obstacles','result','positive','shadow','limits']:
  if isinstance(c.get(k),str) and len(c[k].strip())<8: warnings.append(f'{c["name"]}: короткое поле {k}')
 if len(c.get('symbols',[]))<2: errors.append(f'{c.get("name",i)}: нужны образ и вопрос для наблюдения')
 elif '?' not in c['symbols'][1] and not c['symbols'][1].strip().endswith('？'): warnings.append(f'{c["name"]}: формулировку второго символического текста стоит проверить вручную')
 if c.get('arcana')=='Младший аркан' and (not c.get('suit') or c.get('rank') is None): errors.append(f'{c["name"]}: у младшего аркана не указаны масть/ранг')
 if c.get('arcana')=='Старший аркан' and c.get('suit') is not None: warnings.append(f'{c["name"]}: у старшего аркана неожиданно указана масть')
for k in ['id','name']:
 vals=[c.get(k) for c in cards]
 for v,n in collections.Counter(vals).items():
  if n>1: errors.append(f'Повтор {k}: {v} ({n} раз)')
arc=collections.Counter(c.get('arcana') for c in cards)
suits=collections.Counter(c.get('suit') for c in cards if c.get('suit'))
print('NOCTURNE · АВТОМАТИЧЕСКАЯ РЕДАКЦИОННАЯ ПРОВЕРКА')
print(f'Карт: {len(cards)} | Старшие: {arc.get("Старший аркан",0)} | Младшие: {arc.get("Младший аркан",0)}')
print('Масти: '+', '.join(f'{k}: {v}' for k,v in sorted(suits.items())))
print(f'Уникальных названий: {len(set(c.get("name") for c in cards))}; уникальных ID: {len(set(c.get("id") for c in cards))}')
print(f'Ошибок структуры: {len(errors)} | Предупреждений: {len(warnings)}')
for e in errors: print('ОШИБКА:',e)
for w in warnings: print('ПРЕДУПРЕЖДЕНИЕ:',w)
print('\nОграничение: это автоматическая проверка полноты и структуры, а не экспертная верификация символических трактовок.')
sys.exit(1 if errors else 0)
