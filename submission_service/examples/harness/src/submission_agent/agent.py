"""Minimal Harbor 0.24.0 bridge for the deterministic toy solver.

Interface checked against local Harbor 0.24.0 source. This fixture has not been
executed through Harbor or Docker; the operator must validate that integration.
"""
from __future__ import annotations

import json
import shlex
from pathlib import Path
from typing import Literal

from harbor.agents.base import BaseAgent
from harbor.agents.capabilities import AgentCapabilities
from harbor.agents.options import AgentOptions
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext


class ToyMeanOptions(AgentOptions):
    mode: Literal["correct", "ignore_zero_count"] = "correct"


class ToyMeanAgent(BaseAgent):
    capabilities = AgentCapabilities()
    options_model = ToyMeanOptions

    @staticmethod
    def name() -> str:
        return "toy-mean-fixture"

    def version(self) -> str:
        return "1.0.0"

    async def setup(self, environment: BaseEnvironment) -> None:
        await environment.upload_file(Path(__file__).with_name("solver.py"), "/workspace/submission_solver.py")
        result = await environment.exec("chmod 0644 /workspace/submission_solver.py", user="root", timeout_sec=5)
        if result.return_code != 0:
            raise RuntimeError("Could not prepare the fixture solver")

    async def run(self, instruction: str, environment: BaseEnvironment, context: AgentContext) -> None:
        mode = shlex.quote(self.options.mode)
        command = (
            "cp /workspace/submission_solver.py /output/main.py && "
            "python -I -B /output/main.py --input /data/input.json "
            f"--output /output/result.json --mode {mode}"
        )
        result = await environment.exec(command, user="agent", timeout_sec=20)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        receipt = {"kind": "synthetic-fixture", "mode": self.options.mode,
                   "model_requests": 0, "return_code": result.return_code}
        (self.logs_dir / "toy-execution.json").write_text(json.dumps(receipt) + "\n", encoding="utf-8")
        context.n_input_tokens = 0
        context.n_output_tokens = 0
        context.n_cache_tokens = 0
        context.cost_usd = 0.0
        context.metadata = receipt
        if result.return_code != 0:
            raise RuntimeError("Fixture solver did not complete successfully")
