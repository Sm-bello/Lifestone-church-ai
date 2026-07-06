with open('src-tauri/src/lib.rs', 'r', encoding='utf-8') as f:
    content = f.read()

# The exact old block from the context output
old = '''let model_path = {
                let int8 = base_dir.join("models/qwen3-embedding-0.6b-int8/model_quantized.onnx");
                let fp32 = base_dir.join("models/qwen3-embedding-0.6b/model.onnx");
                if int8.exists() {
                    log::info!("Using INT8 quantized ONNX model");
                    int8
                } else if fp32.exists() {
                    log::info!("Using FP32 ONNX model (INT8 not found)");
                    fp32
                } else {'''

# We need to find the complete block. Let's find the start and manually construct the replacement
# by finding the closing '};'

start = content.find('let model_path = {')
if start < 0:
    print('❌ Could not find model_path')
    exit(1)

# Find the matching closing brace by counting
brace_depth = 0
block_started = False
i = start
while i < len(content):
    if content[i] == '{':
        brace_depth += 1
        block_started = True
    elif content[i] == '}':
        brace_depth -= 1
        if block_started and brace_depth == 0:
            # Check if followed by ';'
            if i + 1 < len(content) and content[i+1] == ';':
                end = i + 2
                break
            else:
                end = i + 1
                break
    i += 1

old_block = content[start:end]
print('Old block:', repr(old_block[:200]), '...', repr(old_block[-100:]))

new_block = '''let model_path = {
                let minilm = base_dir.join("models/minilm-onnx/onnx/model.onnx");
                if minilm.exists() {
                    log::info!("[ONNX] Using MiniLM embedding model: {}", minilm.display());
                    minilm
                } else {
                    let int8 = base_dir.join("models/qwen3-embedding-0.6b-int8/model_quantized.onnx");
                    let fp32 = base_dir.join("models/qwen3-embedding-0.6b/model.onnx");
                    if int8.exists() {
                        log::info!("[ONNX] Using INT8 quantized ONNX model");
                        int8
                    } else if fp32.exists() {
                        log::info!("[ONNX] Using FP32 ONNX model (INT8 not found)");
                        fp32
                    } else {
                        log::info!("[ONNX] Using FP32 ONNX model (INT8 not found)");
                        fp32
                    }
                }
            };'''

content = content[:start] + new_block + content[end:]

with open('src-tauri/src/lib.rs', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ ONNX path patched to MiniLM')
