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
    host = parsed.hostname or "localhost"
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
