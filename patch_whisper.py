import re

with open('src-tauri/crates/lifestone-stt/src/whisper.rs', 'r') as f:
    content = f.read()

# Find and replace the set_language block to add initial_prompt after it
old_pattern = r'(params\.set_language\(Some\(\s*language\.as_deref\(\)\.unwrap_or\("en"\),\s*\)\);)'

def replacement(m):
    return m.group(1) + '''
                // Bible book names prompt — biases Whisper toward correct recognition
                // of scripture references in sermon context
                params.set_initial_prompt(
                    "Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth Samuel Kings Chronicles Ezra Nehemiah Esther Job Psalms Proverbs Ecclesiastes Isaiah Jeremiah Lamentations Ezekiel Daniel Hosea Joel Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai Zechariah Malachi Matthew Mark Luke John Acts Romans Corinthians Galatians Ephesians Philippians Colossians Thessalonians Timothy Titus Philemon Hebrews James Peter Jude Revelation chapter verse verses scripture biblical"
                );'''

content = re.sub(old_pattern, replacement, content, flags=re.DOTALL)

with open('src-tauri/crates/lifestone-stt/src/whisper.rs', 'w') as f:
    f.write(content)

print('Added Bible prompt to Whisper')
