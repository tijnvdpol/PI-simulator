"""Voert de code van de gebruiker uit en geeft een fout terug als gewone dict (of None)."""
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


def run(code):
    runtime.reset()
    try:
        compiled = compile(code, FILENAME, "exec")
        exec(compiled, {"__name__": "__main__"})
    except (SystemExit, KeyboardInterrupt):
        return None
    except BaseException as exc:  # noqa: BLE001 - alles moet naar de gebruiker
        return _describe(exc)
    return None
