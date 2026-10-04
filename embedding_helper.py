import os
import json
import sys

from huggingface_hub import InferenceClient

client = InferenceClient(
    provider="deepinfra",
    api_key=os.environ["HF_TOKEN"],
)

text = sys.argv[1]

result = client.feature_extraction(
    text,
    model="Qwen/Qwen3-Embedding-0.6B",
)

print(json.dumps(result[0].tolist()))
