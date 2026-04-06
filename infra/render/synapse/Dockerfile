# Synapse for Render: Postgres via DATABASE_URL, JWT login for app bridge, disk on /data.
# See README.md for admin token setup and API env vars.
FROM matrixdotorg/synapse:latest

USER root

COPY patch_config.py /patch_config.py
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
