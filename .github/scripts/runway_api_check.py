#!/usr/bin/env python3
"""Read-only Runway credential check; never submits a generation.

Official organization GET /v1/organization and API version were verified against
https://docs.dev.runwayml.com/openapi.json on 2026-11-27. Models and pricing:
https://docs.dev.runwayml.com/guides/models/#3d-mesh-generation
https://docs.dev.runwayml.com/guides/pricing/#3d-generation-pricing

Only fixed statuses and booleans derived from allowlisted fields are emitted.
No credential value, fingerprint, account identity, response body or headers are
logged or persisted. A healthy organization GET does not prove mesh generation
is enabled; the official model guide and OpenAPI mesh coverage currently differ.
Python standard library only. Call through the manual GitHub Actions workflow.
"""

import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import urllib.error
import urllib.request


ENDPOINT = "https://api.dev.runwayml.com/v1/organization"
API_VERSION = "2024-11-06"
SECRET_NAMES = (
    "RUNWAYML_API_SECRET",  # official SDK convention, preferred when configured
    "RUNWAY_API_SECRET",
    "RUNWAY_API_KEY",
    "RUNWAYML_API_KEY",
)
MESH_MODELS = ("trellis_2", "tripo3d_h3_1", "hunyuan_3d_3_1_pro")
MAX_RESPONSE_BYTES = 1_048_576


class NoCredentialRedirect(urllib.request.HTTPRedirectHandler):
    """Do not forward the Authorization header to a redirected location."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def probe(secret, opener=None):
    """Return sanitized health evidence from one exact, non-billable GET."""
    opener = opener or urllib.request.build_opener(NoCredentialRedirect())
    request = urllib.request.Request(
        ENDPOINT,
        method="GET",
        headers={
            "Authorization": "Bearer " + secret,
            "X-Runway-Version": API_VERSION,
            "Accept": "application/json",
            "User-Agent": "Fengming-Runway-ReadOnly-Check/1.0",
        },
    )
    result = {"http_status": None, "healthy": False}
    try:
        with opener.open(request, timeout=25) as response:
            result["http_status"] = response.status
            payload = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        # Do not read/log the body: an upstream service could echo credentials.
        result["http_status"] = error.code
        result["status"] = (
            "redirect_blocked" if 300 <= error.code < 400 else
            "authorization_rejected" if error.code in (401, 403) else
            "rate_limited" if error.code == 429 else
            "service_error" if error.code >= 500 else "http_error"
        )
        error.close()
        return result
    except (urllib.error.URLError, TimeoutError, OSError):
        result["status"] = "network_or_tls_error"
        return result

    if result["http_status"] != 200:
        result["status"] = "unexpected_http_status"
        return result
    if len(payload) > MAX_RESPONSE_BYTES:
        result["status"] = "unexpected_response_size"
        return result
    try:
        data = json.loads(payload)
    except (ValueError, UnicodeError):
        result["status"] = "invalid_json_response"
        return result
    if not isinstance(data, dict):
        result["status"] = "unexpected_response_schema"
        return result
    balance, tier = data.get("creditBalance"), data.get("tier")
    valid_balance = (
        isinstance(balance, (int, float)) and not isinstance(balance, bool)
        and math.isfinite(balance) and balance >= 0
    )
    if not valid_balance or not isinstance(tier, dict):
        result["status"] = "unexpected_response_schema"
        return result

    models = tier.get("models")
    result.update({
        "status": "organization_get_verified",
        "healthy": True,
        "positive_credit_balance": balance > 0,
        "credit_thresholds": {str(n): balance >= n for n in (20, 30, 40, 60)},
        "tier_models_present": isinstance(models, dict),
        # Missing entries are not proof that a model is unavailable. The
        # organization schema may lag the model guide; no generation is probed.
        "mesh_model_listed_in_tier": {
            model: isinstance(models, dict) and model in models
            for model in MESH_MODELS
        },
    })
    return result


def check(environ=None, probe_fn=probe):
    environ = os.environ if environ is None else environ
    credentials = {name: environ.get(name, "").strip() for name in SECRET_NAMES}
    report = {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "request": {"method": "GET", "url": ENDPOINT, "api_version": API_VERSION},
        "secret_present": {name: bool(value) for name, value in credentials.items()},
        "secret_presence_scope": "Only the four names mapped into this workflow job; not a GitHub Secrets inventory.",
        "attempts": [],
        "healthy": False,
        "generation_requested": False,
        "mesh_generation_tested": False,
    }
    seen = set()
    for name, secret in credentials.items():
        if not secret:
            continue
        if secret in seen:
            report["attempts"].append({"secret_name": name, "status": "same_credential_already_checked"})
            continue
        seen.add(secret)
        result = probe_fn(secret)
        report["attempts"].append({"secret_name": name, **result})
        if result["healthy"]:
            report["healthy"] = True
            report["status"] = "organization_get_verified"
            break
    if not report["healthy"]:
        report["status"] = "no_mapped_secret_available" if not seen else "organization_get_not_verified"
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("runway-api-check.json"))
    args = parser.parse_args()
    # A fixed exception message avoids traceback/request objects leaking headers.
    try:
        report = check()
    except Exception:
        report = {"status": "check_internal_error", "healthy": False,
                  "generation_requested": False, "mesh_generation_tested": False}
    encoded = json.dumps(report, ensure_ascii=True, indent=2) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(encoded, encoding="utf-8")
    print(encoded, end="")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write("## Runway read-only API check\n\n```json\n" + encoded + "```\n")
            stream.write("\nOnly the official organization GET was attempted. "
                         "No generation was submitted or charged. A successful check "
                         "does not establish that a 3D generation will succeed.\n")
    return 0 if report["healthy"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
