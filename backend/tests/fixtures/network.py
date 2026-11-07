"""本機網路的輔助函式：未使用的 port 與不回應的 listener。"""

import socket
from collections.abc import Iterator
from contextlib import contextmanager


def unused_local_port() -> int:
    """回傳目前沒有程式在聽的本機 port。連到它會立刻被拒絕。"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.bind(("127.0.0.1", 0))
        return int(probe.getsockname()[1])


@contextmanager
def unresponsive_listener() -> Iterator[int]:
    """接受 TCP 連線但從不回應的本機 listener，回傳它的 port。

    模擬網路中斷或資料庫卡住：連線可以建立，之後的資料永遠不會到。
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen(16)
        yield int(listener.getsockname()[1])
