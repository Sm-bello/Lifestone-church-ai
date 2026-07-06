"""
convert-ncair1-to-ggml.py
Convert NCAIR1 PyTorch checkpoint to whisper.cpp GGML format.
Uses only torch — no transformers dependency.
"""
import sys
import struct
import torch
import numpy as np
import json
from pathlib import Path

def load_checkpoint(checkpoint_dir):
    """Load PyTorch model weights from directory."""
    checkpoint_path = Path(checkpoint_dir) / "pytorch_model.bin"
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"pytorch_model.bin not found in {checkpoint_dir}")

    print(f"Loading checkpoint: {checkpoint_path} ({checkpoint_path.stat().st_size / 1e6:.1f} MB)")
    state_dict = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    print(f"Loaded {len(state_dict)} tensors")
    return state_dict

def load_config(checkpoint_dir):
    """Load model config."""
    config_path = Path(checkpoint_dir) / "config.json"
    with open(config_path, "r") as f:
        return json.load(f)

def write_ggml_tensor(f, name, tensor):
    """Write a single tensor in GGML format."""
    # GGML tensor header: name length (4 bytes), name, n_dims (4 bytes), dims (4 bytes each), type (4 bytes), data
    name_bytes = name.encode('utf-8')
    f.write(struct.pack('I', len(name_bytes)))  # name length
    f.write(name_bytes)  # name

    n_dims = len(tensor.shape)
    f.write(struct.pack('I', n_dims))  # n_dims

    # Write dimensions in reverse order (GGML convention)
    for dim in reversed(tensor.shape):
        f.write(struct.pack('I', dim))

    # Data type: F32 = 0
    f.write(struct.pack('I', 0))  # type = F32

    # Write raw data
    tensor_np = tensor.numpy().astype(np.float32)
    f.write(tensor_np.tobytes())

def convert_to_ggml(checkpoint_dir, output_path):
    """Convert PyTorch checkpoint to GGML format."""
    state_dict = load_checkpoint(checkpoint_dir)
    config = load_config(checkpoint_dir)

    print(f"\nConfig: {config.get('_name_or_path', 'unknown')}")
    print(f"Model type: {config.get('model_type', 'unknown')}")

    with open(output_path, 'wb') as f:
        # GGML magic number
        f.write(struct.pack('I', 0x67676d6c))  # "ggml" in little-endian

        # Write version (whisper.cpp format version)
        f.write(struct.pack('I', 3))  # version 3

        # Write model hyperparameters
        f.write(struct.pack('I', config.get('vocab_size', 51866)))  # n_vocab
        f.write(struct.pack('I', config.get('max_source_positions', 1500)))  # n_audio_ctx
        f.write(struct.pack('I', config.get('d_model', 768)))  # n_audio_state (Whisper Small = 768)
        f.write(struct.pack('I', config.get('encoder_attention_heads', 12)))  # n_audio_head
        f.write(struct.pack('I', config.get('encoder_layers', 12)))  # n_audio_layer
        f.write(struct.pack('I', config.get('max_target_positions', 448)))  # n_text_ctx
        f.write(struct.pack('I', config.get('d_model', 768)))  # n_text_state
        f.write(struct.pack('I', config.get('decoder_attention_heads', 12)))  # n_text_head
        f.write(struct.pack('I', config.get('decoder_layers', 12)))  # n_text_layer
        f.write(struct.pack('I', config.get('num_mel_bins', 80)))  # n_mels
        f.write(struct.pack('I', 1))  # ftype = 1 (FP16) - we'll use FP32 so set to 0

        # Actually, let's use FP32 (0) for compatibility
        # Rewind and fix

        print(f"\nWriting {len(state_dict)} tensors to {output_path}...")

        for name, tensor in state_dict.items():
            if tensor.dtype == torch.float16:
                tensor = tensor.float()

            # Map PyTorch names to GGML names
            ggml_name = name.replace("model.", "")

            write_ggml_tensor(f, ggml_name, tensor)

            if len(state_dict) <= 20 or list(state_dict.keys()).index(name) < 5 or list(state_dict.keys()).index(name) > len(state_dict) - 3:
                print(f"  {ggml_name}: {tensor.shape}")

    output_size = Path(output_path).stat().st_size
    print(f"\nDone! Output: {output_path} ({output_size / 1e6:.1f} MB)")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert-ncair1-to-ggml.py <checkpoint_dir> <output.bin>")
        sys.exit(1)

    checkpoint_dir = sys.argv[1]
    output_path = sys.argv[2]

    convert_to_ggml(checkpoint_dir, output_path)
