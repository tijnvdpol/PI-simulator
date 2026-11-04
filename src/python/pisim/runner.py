"""Voert de code van de gebruiker uit en geeft een fout terug als gewone dict (of None)."""
import sys
import traceback

from . import runtime

FILENAME = "main.py"


def _describe(exc):
    tb = exc.__traceback__
    start = tb
    while start is not None and start.tb_frame.f_code.co_filename != FILENAME:
        start = start.tb_next
    line = None
    cur = start
    while cur is not None:
        if cur.tb_frame.f_code.co_filename == FILENAME:
            line = cur.tb_lineno
        cur = cur.tb_next
    if isinstance(exc, SyntaxError):
        line = exc.lineno
        message = exc.msg
    else:
        message = str(exc)
    text = "".join(traceback.format_exception(type(exc), exc, start if start is not None else tb))
    return {"type": type(exc).__name__, "message": message, "line": line, "traceback": text}


class _Tail:
    """Houdt bij of er een halve regel is geschreven (print("x", end="")), want die zou anders verloren gaan."""

    def __init__(self, stream):
        self._stream = stream
        self.pending = False

    def write(self, text):
        if text:
            self.pending = not text.endswith("\n")
        return self._stream.write(text)

    def __getattr__(self, name):
        return getattr(self._stream, name)


def run(code):
    out, err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = _Tail(out), _Tail(err)
    try:
        return _run(code)
    finally:
        for tail, real in ((sys.stdout, out), (sys.stderr, err)):
            if tail.pending:
                real.write("\n")  # sluit de halve regel af zodat hij in de console verschijnt
        sys.stdout, sys.stderr = out, err


def _run(code):
    runtime.reset()
    try:
        compiled = compile(code, FILENAME, "exec")
        exec(compiled, {"__name__": "__main__"})
    except (SystemExit, KeyboardInterrupt):
        return None
    except BaseException as exc:  # noqa: BLE001 - alles moet naar de gebruiker
        return _describe(exc)
    return None
