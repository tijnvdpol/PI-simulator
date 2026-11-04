"""Coöperatieve scheduler: Pyodide heeft geen threads, dus blink(), when_pressed en pause()
draaien terwijl de gebruikerscode wacht (sleep/pause/wait_for_press)."""
import _hw

SLICE = 0.01          # hoe vaak knoppen worden gecontroleerd als er callbacks zijn
EPS = 1e-9

_timers = []          # lijst van Handle
_watchers = []        # lijst van Handle
_seq = 0


class Handle:
    __slots__ = ("due", "fn", "seq", "cancelled")

    def __init__(self, due, fn, seq):
        self.due = due
        self.fn = fn
        self.seq = seq
        self.cancelled = False


def after(delay, fn):
    global _seq
    _seq += 1
    h = Handle(_hw.now() + delay, fn, _seq)
    _timers.append(h)
    return h


def cancel(handle):
    if handle is not None:
        handle.cancelled = True


def add_watcher(fn):
    h = Handle(0, fn, 0)
    _watchers.append(h)
    return h


def remove_watcher(handle):
    if handle is not None:
        handle.cancelled = True


def reset():
    _timers.clear()
    _watchers.clear()


def _run_due():
    """Voer verlopen timers uit (op volgorde) en roep de watchers aan."""
    while True:
        _timers[:] = [t for t in _timers if not t.cancelled]
        now = _hw.now()
        due = [t for t in _timers if t.due <= now + EPS]
        if not due:
            break
        due.sort(key=lambda t: (t.due, t.seq))
        t = due[0]
        _timers.remove(t)
        t.fn()
    _watchers[:] = [w for w in _watchers if not w.cancelled]
    for w in list(_watchers):
        if not w.cancelled:
            w.fn()


def _next_step(limit):
    """Hoe lang mogen we maximaal slapen voordat er iets moet gebeuren."""
    now = _hw.now()
    step = limit
    live = [t.due - now for t in _timers if not t.cancelled]
    if live:
        step = min(step, max(min(live), 0.0))
    if any(not w.cancelled for w in _watchers):
        step = min(step, SLICE)
    return step


def wait(seconds):
    end = _hw.now() + seconds
    _run_due()
    while True:
        remaining = end - _hw.now()
        if remaining <= EPS:
            break
        step = _next_step(remaining)
        _hw.sleep(step if step > 0 else 0.0)
        _run_due()


def wait_until(predicate, timeout=None):
    """Wacht tot predicate() waar is. Geeft False terug bij timeout."""
    end = None if timeout is None else _hw.now() + timeout
    _run_due()
    while True:
        if predicate():
            return True
        if end is not None and _hw.now() >= end - EPS:
            return False
        limit = SLICE if end is None else min(SLICE, end - _hw.now())
        _hw.sleep(min(_next_step(limit), limit))
        _run_due()


def run_forever():
    while True:
        _run_due()
        _hw.sleep(_next_step(1.0) or 0.0)
