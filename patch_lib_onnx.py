import re

with open('src-tauri/src/lib.rs', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the ONNX path block and replace it entirely
old_block = '''let model_path = {
                  let int8 = base_dir.join("models/qwen3-embedding-0.6b-int8/model_quantized.onnx");
                  let fp32 = base_dir.join("models/qwen3-embedding-0.6b/model.onnx");
                  if int8.exists() {
                      log::info!("Using INT8 quantized ONNX model");
                      int8
                  } else {
                      log::info!("Using FP32 ONNX model");
                      fp32
                  }
              };'''

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
                      } else {
                          log::info!("[ONNX] Using FP32 ONNX model");
                          fp32
                      }
                  }
              };'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print('✅ ONNX path patched to MiniLM')
else:
    print('❌ Could not find exact block to replace')
    # Try to find what's actually there
    idx = content.find('let model_path = {')
    if idx >= 0:
        print('Found model_path at index', idx)
        print('Context:', repr(content[idx:idx+500]))

with open('src-tauri/src/lib.rs', 'w', encoding='utf-8') as f:
    f.write(content)
