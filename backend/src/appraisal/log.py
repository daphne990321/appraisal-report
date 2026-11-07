"""logging 設定：唯一設定 logging 的地方（Alembic 不另外設定）。"""

import logging
import sys

_HANDLER_NAME = "appraisal-stderr"
_FORMAT = "%(asctime)s %(levelname)s %(name)s %(message)s"


def configure_logging(level: str) -> None:
    """在 root logger 設定一個 stderr handler，並設定 root 與 appraisal logger 的等級。

    重複呼叫不會增加 handler。
    """
    root = logging.getLogger()
    if not any(h.get_name() == _HANDLER_NAME for h in root.handlers):
        handler = logging.StreamHandler(sys.stderr)
        handler.set_name(_HANDLER_NAME)
        handler.setFormatter(logging.Formatter(_FORMAT))
        root.addHandler(handler)
    root.setLevel(level)
    logging.getLogger("appraisal").setLevel(level)
