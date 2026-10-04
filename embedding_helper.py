import json
import os
import sys

from huggingface_hub import InferenceClient


token = os.environ.get("HF_TOKEN")

if not token:
    raise RuntimeError("HF_TOKEN is missing")

if len(sys.argv) < 2:
    raise RuntimeError("Text to embed was not provided")

text = sys.argv[1]

client = InferenceClient(
    provider="deepinfra",
    api_key=token,
)

try:
    result = client.feature_extraction(
        text,
        model="Qwen/Qwen3-Embedding-0.6B",
    )

    if hasattr(result, "tolist"):
        result = result.tolist()

    # Hugging Face may return [[1024 values]]
    # instead of [1024 values].
    if len(result) == 1 and isinstance(result[0], list):
        result = result[0]

    if len(result) != 1024:
        raise RuntimeError(
            f"Expected 1024-dimensional embedding, got {len(result)}"
        )

    print(json.dumps(result))

except Exception as e:
    raise RuntimeError(
        f"Hugging Face embedding request failed: "
        f"{type(e).__name__}: {e}"
    ) from e
