"""Execute the installed LiteLLM calculator; never issue model/API requests."""
import importlib.metadata
import json
import os
import socket
import sys
from pathlib import Path

protocol_stdout = sys.stdout
sys.stdout = sys.stderr

os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"
os.environ["LITELLM_MODE"] = "PRODUCTION"  # SDK DEV mode reads .env files.
import dotenv
assert dotenv.find_dotenv(usecwd=True) == os.environ["CENTRAIL_TEST_DOTENV_PATH"]
# A failed attempted network call is a comparison failure, never live fallback.
network_attempts = 0
def no_network(*args, **kwargs):
    global network_attempts
    network_attempts += 1
    raise RuntimeError("Network disabled in offline cost comparison")
socket.create_connection = no_network
socket.socket.connect = no_network
socket.socket.connect_ex = no_network
import litellm
assert "OPENAI_API_KEY" not in os.environ, "Fake parent .env credential was loaded"

assert importlib.metadata.version("litellm") == "1.105.0"
for requirement in Path(__file__).with_name("comparison-litellm-requirements.txt").read_text().splitlines():
    package, expected_version = requirement.split("==")
    assert importlib.metadata.version(package) == expected_version, f"Dependency drift: {package}"
litellm.model_cost = {}
results = []
for case in json.load(sys.stdin):
    model = case["model"]
    if case["source"]:
        litellm.register_model({model: case["source"]})
    usage = case["usage"]
    tokens = litellm.Usage(
        prompt_tokens=usage["input"] + usage["cacheRead"] + usage["cacheWrite5m"] + usage["cacheWrite1h"],
        completion_tokens=usage["output"],
        prompt_tokens_details={
            "cached_tokens": usage["cacheRead"],
            "cache_creation_tokens": usage["cacheWrite5m"] + usage["cacheWrite1h"],
            "cache_creation_token_details": {
                "ephemeral_5m_input_tokens": usage["cacheWrite5m"],
                "ephemeral_1h_input_tokens": usage["cacheWrite1h"],
            },
        },
    )
    response = litellm.ModelResponse(model=model, usage=tokens)
    try:
        usd = litellm.completion_cost(completion_response=response, model=model, custom_llm_provider=case["provider"])
        results.append({"id": case["id"], "usd": usd})
    except Exception as error:
        results.append({"id": case["id"], "error": type(error).__name__, "message": str(error)[:500]})
assert network_attempts == 0, f"Attempted offline network connections: {network_attempts}"
assert "OPENAI_API_KEY" not in os.environ, "Fake parent .env credential was loaded"
print(json.dumps({"version": importlib.metadata.version("litellm"), "networkAttempts": network_attempts, "parentDotenvNotLoaded": True, "results": results}), file=protocol_stdout)
