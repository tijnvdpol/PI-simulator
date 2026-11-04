import inspect

import _hw

from . import _scheduler
from .devices import Device


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
