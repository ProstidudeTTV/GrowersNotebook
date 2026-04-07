#!/usr/bin/env python3
"""Patch Synapse homeserver.yaml for Render: Postgres, JWT, listener on PORT, public_baseurl."""
from __future__ import annotations

import os
import sys
import urllib.parse

import yaml

CONFIG_PATH = os.environ.get("SYNAPSE_CONFIG_PATH", "/data/homeserver.yaml")


def main() -> None:
    db_url = os.environ.get("DATABASE_URL", "").strip()
    if not db_url:
        print("ERROR: DATABASE_URL is required.", file=sys.stderr)
        sys.exit(1)

    if db_url.startswith("postgres://"):
        db_url = "postgresql://" + db_url[len("postgres://") :]

    parsed = urllib.parse.urlparse(db_url)
    user = urllib.parse.unquote(parsed.username or "")
    password = urllib.parse.unquote(parsed.password or "")
    database = (parsed.path or "").lstrip("/").split("?")[0]
    host = parsed.hostname or "127.0.0.1"
    dbport = parsed.port or 5432
    query = urllib.parse.parse_qs(parsed.query or "")
    sslmode = (query.get("sslmode") or [None])[0]

    public_base = os.environ["SYNAPSE_PUBLIC_BASE_URL"].rstrip("/") + "/"
    jwt_secret = os.environ["SYNAPSE_JWT_SECRET"]
    listen_port = int(os.environ.get("PORT", os.environ.get("SYNAPSE_HTTP_PORT", "8008")))

    with open(CONFIG_PATH, encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    cfg["public_baseurl"] = public_base
    cfg["jwt_config"] = {
        "enabled": True,
        "algorithm": "HS256",
        "secret": jwt_secret,
    }

    db_args = {
        "user": user,
        "password": password,
        "database": database,
        "host": host,
        "port": dbport,
        "cp_min": 1,
        "cp_max": 10,
    }
    if sslmode:
        db_args["sslmode"] = sslmode

    cfg["database"] = {
        "name": "psycopg2",
        # Render (and many hosts) use en_US.UTF8; Synapse expects C unless:
        "allow_unsafe_locale": True,
        "args": db_args,
    }

    cfg["listeners"] = [
        {
            "port": listen_port,
            "tls": False,
            "type": "http",
            "bind_addresses": ["0.0.0.0"],
            "x_forwarded": True,
            "resources": [{"names": ["client", "federation"], "compress": False}],
        }
    ]

    cfg["federation_domain_whitelist"] = []

    # Docker defaults are extremely low for a JWT-based web app: every client open hits m.login (rc_login),
    # createRoom hits rc_invites — defaults (~0.003/s, burst 5) cause 429 "Too Many Requests" under normal traffic.
    cfg["rc_message"] = {"per_second": 3.0, "burst_count": 80.0}
    cfg["rc_login"] = {
        "address": {"per_second": 2.0, "burst_count": 250},
        "account": {"per_second": 2.0, "burst_count": 250},
    }
    cfg["rc_joins"] = {
        "local": {"per_second": 10.0, "burst_count": 100},
        "remote": {"per_second": 2.0, "burst_count": 50},
    }
    cfg["rc_joins_per_room"] = {"per_second": 5.0, "burst_count": 50}
    cfg["rc_invites"] = {
        "per_room": {"per_second": 10.0, "burst_count": 100},
        "per_user": {"per_second": 2.0, "burst_count": 80},
        "per_issuer": {"per_second": 10.0, "burst_count": 100},
    }
    # Legacy flat keys (still honored by many Synapse versions); keep aligned with rc_message.
    cfg["rc_messages_per_second"] = 3.0
    cfg["rc_message_burst_count"] = 80.0

    reg_secret = os.environ.get("SYNAPSE_REGISTRATION_SHARED_SECRET", "").strip()
    if reg_secret:
        cfg["registration_shared_secret"] = reg_secret
    else:
        # Do not leave a stale secret in yaml if env was removed.
        cfg.pop("registration_shared_secret", None)

    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump(
            cfg,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
        )

    print(f"Patched {CONFIG_PATH} (listener port={listen_port}).")


if __name__ == "__main__":
    main()
