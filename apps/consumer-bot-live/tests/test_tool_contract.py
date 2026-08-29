"""Guard the seam between tool schemas, the dispatch table, and the functions.

Several people and agents edit agent/tool_schemas.py, agent/core.py and
tools/*.py in parallel. Drift between them fails at runtime inside the OpenAI
loop, where it surfaces as a confusing tool error rather than an import error,
so it is worth catching here instead.

These tests need no database or API key.
"""

from __future__ import annotations

import inspect
import json
import unittest

from agent.core import TOOL_DISPATCH
from agent.tool_schemas import ALL_TOOLS

# Parameters agent/core.py injects into the call rather than accepting from the
# model, because the model must never invent a user's identity. A tool may
# require these even though no schema advertises them.
LOOP_INJECTED_PARAMS = {"telegram_user_id", "telegram_chat_id"}


def _schema_params(tool: dict) -> dict:
    return tool["parameters"].get("properties", {})


class ToolSchemaTests(unittest.TestCase):
    def test_names_match_dispatch_table(self) -> None:
        schema_names = {tool["name"] for tool in ALL_TOOLS}
        self.assertEqual(schema_names, set(TOOL_DISPATCH))

    def test_no_duplicate_tool_names(self) -> None:
        names = [tool["name"] for tool in ALL_TOOLS]
        self.assertCountEqual(names, set(names))

    def test_uses_responses_api_shape(self) -> None:
        for tool in ALL_TOOLS:
            with self.subTest(tool=tool["name"]):
                self.assertEqual(tool.get("type"), "function")
                # Chat Completions nests under "function"; Responses is flat.
                self.assertNotIn("function", tool)

    def test_strict_mode_requirements(self) -> None:
        for tool in ALL_TOOLS:
            if not tool.get("strict"):
                continue
            with self.subTest(tool=tool["name"]):
                params = tool["parameters"]
                self.assertIs(params.get("additionalProperties"), False)
                # Strict mode requires every property to be listed as required.
                self.assertEqual(
                    set(params.get("properties", {})),
                    set(params.get("required", [])),
                )

    def test_schemas_are_json_serialisable(self) -> None:
        json.dumps(ALL_TOOLS)


class ToolSignatureTests(unittest.TestCase):
    def test_functions_accept_every_schema_param(self) -> None:
        for tool in ALL_TOOLS:
            name = tool["name"]
            with self.subTest(tool=name):
                signature = inspect.signature(TOOL_DISPATCH[name])
                accepts_kwargs = any(
                    p.kind is inspect.Parameter.VAR_KEYWORD
                    for p in signature.parameters.values()
                )
                if accepts_kwargs:
                    continue
                unknown = set(_schema_params(tool)) - set(signature.parameters)
                self.assertFalse(
                    unknown, f"{name} schema sends params it cannot accept: {unknown}"
                )

    def test_every_required_param_is_supplied(self) -> None:
        """A tool must get every argument it requires from schema or injection."""
        for tool in ALL_TOOLS:
            name = tool["name"]
            with self.subTest(tool=name):
                signature = inspect.signature(TOOL_DISPATCH[name])
                required = {
                    pname
                    for pname, p in signature.parameters.items()
                    if p.default is inspect.Parameter.empty
                    and p.kind
                    in (
                        inspect.Parameter.POSITIONAL_OR_KEYWORD,
                        inspect.Parameter.KEYWORD_ONLY,
                    )
                }
                unsatisfied = required - set(_schema_params(tool))
                unsatisfied -= LOOP_INJECTED_PARAMS
                self.assertFalse(
                    unsatisfied,
                    f"{name} requires params nothing supplies: {unsatisfied}",
                )


if __name__ == "__main__":
    unittest.main()
