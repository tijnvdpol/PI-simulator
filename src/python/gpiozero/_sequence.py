"""Speelt een rij (waarde, duur)-stappen af: voor blink() en pulse() met fades. Draait op de scheduler (geen threads)."""
from . import _scheduler

FPS = 25   # zoals gpiozero: fades bestaan uit 25 stapjes per seconde


def fade_steps(from_value, to_value, seconds, blend):
    """Stapjes van `from_value` naar `to_value` (de eindwaarde zelf hoort er niet bij)."""
    count = int(FPS * seconds)
    return [(blend(from_value, to_value, i / count), 1.0 / FPS) for i in range(count)] if count > 0 else []


def blink_steps(on, off, on_time, off_time, fade_in_time, fade_out_time, blend):
    steps = fade_steps(off, on, fade_in_time, blend)
    steps.append((on, on_time))
    steps += fade_steps(on, off, fade_out_time, blend)
    steps.append((off, off_time))
    return steps


class Sequence:
    def __init__(self, apply):
        self._apply = apply
        self._timer = None
        self._steps = []
        self._i = 0
        self._left = None
        self.running = False

    def start(self, steps, n):
        self.stop()
        self._steps, self._i, self._left, self.running = steps, 0, n, True
        self._step()

    def stop(self):
        _scheduler.cancel(self._timer)
        self._timer = None
        self.running = False

    def _step(self):
        value, duration = self._steps[self._i]
        self._apply(value)
        self._i += 1
        if self._i >= len(self._steps):
            self._i = 0
            if self._left is not None:
                self._left -= 1
                if self._left <= 0:
                    self._timer = _scheduler.after(duration, self._finish)
                    return
        self._timer = _scheduler.after(duration, self._step)

    def _finish(self):
        self._timer = None
        self.running = False

    def run_blocking(self, steps, n):
        """Voor background=False: speelt alles af en wacht (n=None loopt tot Stop)."""
        self.stop()
        left = n
        while left is None or left > 0:
            for value, duration in steps:
                self._apply(value)
                _scheduler.wait(duration)
            if left is not None:
                left -= 1
