# Repo-root Docker build for Render when the service uses context `.` and `./Dockerfile`
# (e.g. Render MCP `create_web_service`). IaC in render.yaml uses
# dockerContext ./infra/render/synapse instead — keep logic aligned with
# infra/render/synapse/Dockerfile.
FROM matrixdotorg/synapse:latest

USER root

COPY infra/render/synapse/patch_config.py /patch_config.py
COPY infra/render/synapse/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
