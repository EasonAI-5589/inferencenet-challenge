FROM python:3.12.7-slim
RUN useradd --uid 10001 --create-home agent \
    && mkdir -p /data /output /workspace \
    && chown agent:agent /output /workspace
COPY data/input.json /data/input.json
RUN chmod 0444 /data/input.json && chmod 0555 /data
WORKDIR /workspace
CMD ["sleep", "infinity"]
