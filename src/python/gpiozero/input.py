import inspect

import _hw

from . import _scheduler
from .devices import Device
from .exc import GPIOPinMissing


class Button(Device):
    """Drukknop. `pull_up`, `bounce_time` en `hold_time` worden aanvaard voor compatibiliteit."""
    _part_kind = "button"

    def __init__(self, pin=None, *, pull_up=True, active_state=None, bounce_time=None, hold_time=1, hold_repeat=False, pin_factory=None):
        super().__init__(pin)
        self.pull_up = pull_up
        self.hold_time = hold_time
        self._when_pressed = None
        self._when_released = None
        self._watcher = None
        self._last = self.is_pressed

    @property
    def is_pressed(self):
        self._check_open()
        return bool(_hw.readButton(self._pin))

    @property
    def pressed(self):
        return self.is_pressed

    @property
    def value(self):
        return 1 if self.is_pressed else 0

    def wait_for_press(self, timeout=None):
        return _scheduler.wait_until(lambda: self.is_pressed, timeout)

    def wait_for_release(self, timeout=None):
        return _scheduler.wait_until(lambda: not self.is_pressed, timeout)

    @property
    def when_pressed(self):
        return self._when_pressed

    @when_pressed.setter
    def when_pressed(self, fn):
        self._when_pressed = fn
        self._update_watcher()

    @property
    def when_released(self):
        return self._when_released

    @when_released.setter
    def when_released(self, fn):
        self._when_released = fn
        self._update_watcher()

    def _update_watcher(self):
        wanted = self._when_pressed is not None or self._when_released is not None
        if wanted and self._watcher is None:
            self._last = self.is_pressed
            self._watcher = _scheduler.add_watcher(self._poll)
        elif not wanted and self._watcher is not None:
            _scheduler.remove_watcher(self._watcher)
            self._watcher = None

    def _call(self, fn):
        try:
            takes_arg = len(inspect.signature(fn).parameters) >= 1
        except (TypeError, ValueError):
            takes_arg = False
        fn(self) if takes_arg else fn()

    def _poll(self):
        now = self.is_pressed
        if now == self._last:
            return
        self._last = now
        fn = self._when_pressed if now else self._when_released
        if fn is not None:
            self._call(fn)

    def close(self):
        if self._watcher is not None:
            _scheduler.remove_watcher(self._watcher)
            self._watcher = None
        super().close()


class DistanceSensor(Device):
    """Afstandssensor HC-SR04. `distance` is in meters (tot `max_distance`), `value` loopt van 0 tot 1.
    In de simulator stel je de afstand in met het schuifje op de werkbank (2–400 cm)."""
    _part_kind = "distance"

    def __init__(self, echo=None, trigger=None, *, queue_len=9, max_distance=1, threshold_distance=0.3, partial=False, pin_factory=None):
        self._pin = None
        self._pins = []
        self._closed = False
        self._watcher = None
        if echo is None or trigger is None:
            raise GPIOPinMissing("echo and trigger pins must be provided")
        if max_distance <= 0:
            raise ValueError("invalid maximum distance (must be positive)")
        self._max_distance = max_distance
        self.threshold_distance = threshold_distance
        self._when_in_range = None
        self._when_out_of_range = None
        self._echo, self._trigger = self._attach_pins([echo, trigger])
        self._pin = self._echo
        self._last = False

    @property
    def echo(self):
        return self._echo

    @property
    def trigger(self):
        return self._trigger

    @property
    def max_distance(self):
        return self._max_distance

    @max_distance.setter
    def max_distance(self, v):
        if v <= 0:
            raise ValueError("invalid maximum distance (must be positive)")
        self._max_distance = v

    @property
    def distance(self):
        self._check_open()
        cm = _hw.readDistance(self._echo)
        top = float(self._max_distance)
        if cm <= 0:        # geen echo: de sensor ziet niets
            return top
        return min(cm / 100.0, top)

    @property
    def value(self):
        return self.distance / self._max_distance

    @property
    def in_range(self):
        return self.distance < self.threshold_distance

    is_active = in_range

    def wait_for_in_range(self, timeout=None):
        return _scheduler.wait_until(lambda: self.in_range, timeout)

    def wait_for_out_of_range(self, timeout=None):
        return _scheduler.wait_until(lambda: not self.in_range, timeout)

    @property
    def when_in_range(self):
        return self._when_in_range

    @when_in_range.setter
    def when_in_range(self, fn):
        self._when_in_range = fn
        self._update_watcher()

    @property
    def when_out_of_range(self):
        return self._when_out_of_range

    @when_out_of_range.setter
    def when_out_of_range(self, fn):
        self._when_out_of_range = fn
        self._update_watcher()

    def _update_watcher(self):
        wanted = self._when_in_range is not None or self._when_out_of_range is not None
        if wanted and self._watcher is None:
            self._last = self.in_range
            self._watcher = _scheduler.add_watcher(self._poll)
        elif not wanted and self._watcher is not None:
            _scheduler.remove_watcher(self._watcher)
            self._watcher = None

    def _poll(self):
        now = self.in_range
        if now == self._last:
            return
        self._last = now
        fn = self._when_in_range if now else self._when_out_of_range
        if fn is not None:
            Button._call(self, fn)

    def close(self):
        if self._watcher is not None:
            _scheduler.remove_watcher(self._watcher)
            self._watcher = None
        super().close()
