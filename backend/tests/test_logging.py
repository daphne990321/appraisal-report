"""configure_logging() 的行為。

探測程式在獨立的 Python process 中執行，root logger 的 handler 不會在測試之間互相影響。
"""

import logging
import subprocess
import sys

_PROBE_MESSAGE = "probe-line-logged-once"

_PROBE_SCRIPT = f"""
import logging

from appraisal.log import configure_logging

configure_logging("INFO")
configure_logging("INFO")
logging.getLogger("appraisal.probe").info("{_PROBE_MESSAGE}")
print(logging.getLogger().level)
print(logging.getLogger("appraisal").level)
"""


def test_repeated_configuration_logs_each_line_once_and_sets_root_and_appraisal_levels() -> None:
    result = subprocess.run(
        [sys.executable, "-c", _PROBE_SCRIPT],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    assert result.returncode == 0, f"probe process failed, stderr was: {result.stderr!r}"
    assert result.stderr.count(_PROBE_MESSAGE) == 1, (
        f"the probe line should be logged exactly once, stderr was: {result.stderr!r}"
    )
    levels = [int(line) for line in result.stdout.split()]
    assert levels == [logging.INFO, logging.INFO], (
        f"the root and appraisal logger levels should both be INFO, stdout was: {result.stdout!r}"
    )
