
import json

path = r'C:\Users\User\lifestone\src-tauri\tauri.conf.json'

with open(path, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Remove large-v3-turbo from resources (keep base.en, nigerian, minilm, db)
resources = config['bundle']['resources']

# Remove large-v3-turbo if present
key_to_remove = '../models/whisper/ggml-large-v3-turbo-q8_0.bin'
if key_to_remove in resources:
    del resources[key_to_remove]
    print(f'Removed {key_to_remove} from bundle')

# Keep: base.en, nigerian, minilm, db
print('\nRemaining bundled resources:')
for k, v in resources.items():
    print(f'  {k} -> {v}')

with open(path, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2)

print('\nBundle config updated. Total size should now be under 2GB.')
