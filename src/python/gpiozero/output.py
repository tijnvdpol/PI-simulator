import _hw

from . import _scheduler
from .devices import Device


class OutputDevice(Device):
    """Een aan/uit-uitgang (LED, Buzzer). `active_high` wordt onthouden maar heeft geen effect in de simulator."""

    def __init__(self, pin=None, *, active_high=True, initial_value=False, pin_factory=None):
        super().__init__(pin)
        self._active_high = active_high
        self._value = False
        self._blink_timer = None
        self._blink_left = None
        self._write(bool(initial_value))

    def _write(self, on):
        self._value = bool(on)
        _hw.writeOutput(self._pin, 1 if on else 0)

    def _stop_blink(self):
        _scheduler.cancel(self._blink_timer)
        self._blink_timer = None
        self._blink_left = None

    def on(self):
        self._check_open()
        self._stop_blink()
        self._write(True)

    def off(self):
        self._check_open()
        self._stop_blink()
        self._write(False)

    def toggle(self):
        self._check_open()
        self._stop_blink()
        self._write(not self._value)

    @property
    def value(self):
        self._check_open()
        return 1 if self._value else 0

    @value.setter
    def value(self, v):
        self.on() if v else self.off()

    @property
    def is_active(self):
        return self._value

    @property
    def active_high(self):
        return self._active_high

    def blink(self, on_time=1, off_time=1, n=None, background=True):
        self._check_open()
        self._stop_blink()
        self._blink_left = n
        if background:
            self._blink_on(on_time, off_time)
            return
        remaining = n
        while remaining is None or remaining > 0:
            self._write(True)
            _scheduler.wait(on_time)
            self._write(False)
            _scheduler.wait(off_time)
            if remaining is not None:
                remaining -= 1

    def _blink_on(self, on_time, off_time):
        self._write(True)
        self._blink_timer = _scheduler.after(on_time, lambda: self._blink_off(on_time, off_time))

    def _blink_off(self, on_time, off_time):
        self._write(False)
        if self._blink_left is not None:
            self._blink_left -= 1
            if self._blink_left <= 0:
                self._blink_timer = None
                return
        self._blink_timer = _scheduler.after(off_time, lambda: self._blink_on(on_time, off_time))

    def close(self):
        if not self._closed:
            self._stop_blink()
            if self._pin is not None:
                self._write(False)
        super().close()


class DigitalOutputDevice(OutputDevice):
    pass


class LED(DigitalOutputDevice):
    _part_kind = "led"

    @property
    def is_lit(self):
        return self._value


class Buzzer(DigitalOutputDevice):
    _part_kind = "buzzer"

    def beep(self, on_time=1, off_time=1, n=None, background=True):
        self.blink(on_time, off_time, n, background)
