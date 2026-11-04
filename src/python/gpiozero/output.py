import _hw

from . import _scheduler, _sequence
from .devices import Device
from .exc import OutputDeviceBadValue, GPIOPinMissing


class OutputDevice(Device):
    """Een aan/uit-uitgang (LED, Buzzer). `active_high` wordt onthouden maar heeft geen effect in de simulator."""

    def __init__(self, pin=None, *, active_high=True, initial_value=False, pin_factory=None):
        super().__init__(pin)
        self._active_high = active_high
        self._value = False
        self._blink_timer = None
        self._blink_left = None
        self._write(self._coerce(initial_value))

    def _coerce(self, value):
        return bool(value)

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
    _also_ok = ("pwmled",)   # een LED-programma werkt ook op een dimbare led (hij gaat dan alleen aan en uit)

    @property
    def is_lit(self):
        return self._value


class Buzzer(DigitalOutputDevice):
    _part_kind = "buzzer"

    def beep(self, on_time=1, off_time=1, n=None, background=True):
        self.blink(on_time, off_time, n, background)


class PWMOutputDevice(OutputDevice):
    """Uitgang met een waarde van 0 tot 1 (dimmen). `frequency` wordt onthouden maar heeft geen effect."""

    def __init__(self, pin=None, *, active_high=True, initial_value=0, frequency=100, pin_factory=None):
        self._seq = None
        self._frequency = frequency
        super().__init__(pin, active_high=active_high, initial_value=initial_value)
        self._seq = _sequence.Sequence(self._write)

    def _coerce(self, value):
        if isinstance(value, bool):
            return 1.0 if value else 0.0
        if not isinstance(value, (int, float)) or not 0 <= value <= 1:
            raise OutputDeviceBadValue("PWM value must be between 0 and 1")
        return float(value)

    def _write(self, level):
        self._value = self._coerce(level)
        _hw.writeOutput(self._pin, self._value)

    def _stop_blink(self):
        if self._seq is not None:
            self._seq.stop()

    @property
    def value(self):
        self._check_open()
        return self._value

    @value.setter
    def value(self, v):
        self._check_open()
        self._stop_blink()
        self._write(v)

    def toggle(self):
        self._check_open()
        self._stop_blink()
        self._write(1.0 - self._value)

    @property
    def is_active(self):
        return self._value > 0

    @property
    def frequency(self):
        return self._frequency

    @frequency.setter
    def frequency(self, v):
        self._frequency = v

    def blink(self, on_time=1, off_time=1, fade_in_time=0, fade_out_time=0, n=None, background=True):
        self._check_open()
        self._stop_blink()
        steps = _sequence.blink_steps(1.0, 0.0, on_time, off_time, fade_in_time, fade_out_time, lambda a, b, t: a + (b - a) * t)
        if background:
            self._seq.start(steps, n)
        else:
            self._seq.run_blocking(steps, n)

    def pulse(self, fade_in_time=1, fade_out_time=1, n=None, background=True):
        self.blink(0, 0, fade_in_time, fade_out_time, n, background)


class PWMLED(PWMOutputDevice):
    _part_kind = "pwmled"

    @property
    def is_lit(self):
        return self._value > 0


def _color(value, pwm):
    try:
        r, g, b = value
    except (TypeError, ValueError):
        raise OutputDeviceBadValue("color must be a tuple of three numbers (red, green, blue)")
    out = []
    for c in (r, g, b):
        if isinstance(c, bool):
            c = 1 if c else 0
        if not isinstance(c, (int, float)) or not 0 <= c <= 1:
            raise OutputDeviceBadValue("each color component must be between 0 and 1")
        if not pwm and c not in (0, 1):
            raise OutputDeviceBadValue("each color component must be 0 or 1 when pwm=False")
        out.append(float(c))
    return tuple(out)


class Color(tuple):
    """(rood, groen, blauw), elk van 0 tot 1. Uit te pakken als een tuple."""
    __slots__ = ()

    def __new__(cls, red, green, blue):
        return tuple.__new__(cls, (red, green, blue))

    red = property(lambda self: self[0])
    green = property(lambda self: self[1])
    blue = property(lambda self: self[2])

    def __repr__(self):
        return "Color(red=%s, green=%s, blue=%s)" % tuple(self)


class RGBLED(Device):
    """Led met drie kleuren (rood, groen, blauw), elk op een eigen pin. `.color = (r, g, b)` met waarden 0–1."""
    _part_kind = "rgbled"

    def __init__(self, red=None, green=None, blue=None, *, active_high=True, initial_value=(0, 0, 0), pwm=True, pin_factory=None):
        self._pin = None
        self._pins = []
        self._closed = False
        self._seq = None
        if red is None or green is None or blue is None:
            raise GPIOPinMissing("red, green, and blue pins must be provided")
        self._pwm = pwm
        self._active_high = active_high
        self._rgb = (0.0, 0.0, 0.0)
        start = _color(initial_value, pwm)
        self._red, self._green, self._blue = self._attach_pins([red, green, blue])
        self._pin = self._red
        self._seq = _sequence.Sequence(self._write)
        self._write(start)

    def _write(self, rgb):
        self._rgb = tuple(float(c) for c in rgb)
        for pin, level in zip((self._red, self._green, self._blue), self._rgb):
            _hw.writeOutput(pin, level)

    def _stop_blink(self):
        if self._seq is not None:
            self._seq.stop()

    @property
    def color(self):
        self._check_open()
        return Color(*self._rgb)

    @color.setter
    def color(self, value):
        self._check_open()
        self._stop_blink()
        self._write(_color(value, self._pwm))

    @property
    def value(self):
        self._check_open()
        return self._rgb

    @value.setter
    def value(self, v):
        self.color = v

    red = property(lambda self: self.color.red, lambda self, v: setattr(self, "color", (v, self._rgb[1], self._rgb[2])))
    green = property(lambda self: self.color.green, lambda self, v: setattr(self, "color", (self._rgb[0], v, self._rgb[2])))
    blue = property(lambda self: self.color.blue, lambda self, v: setattr(self, "color", (self._rgb[0], self._rgb[1], v)))

    @property
    def is_lit(self):
        return any(c > 0 for c in self._rgb)

    is_active = is_lit

    @property
    def active_high(self):
        return self._active_high

    def on(self):
        self.color = (1, 1, 1)

    def off(self):
        self.color = (0, 0, 0)

    def toggle(self):
        r, g, b = self._rgb
        self.color = (1 - r, 1 - g, 1 - b)

    def blink(self, on_time=1, off_time=1, fade_in_time=0, fade_out_time=0, on_color=(1, 1, 1), off_color=(0, 0, 0), n=None, background=True):
        self._check_open()
        if not self._pwm and (fade_in_time or fade_out_time):
            raise ValueError("fade_in_time and fade_out_time must be 0 with non-PWM RGBLEDs")
        on, off = _color(on_color, self._pwm), _color(off_color, self._pwm)
        self._stop_blink()
        steps = _sequence.blink_steps(on, off, on_time, off_time, fade_in_time, fade_out_time,
                                      lambda a, b, t: tuple(x + (y - x) * t for x, y in zip(a, b)))
        if background:
            self._seq.start(steps, n)
        else:
            self._seq.run_blocking(steps, n)

    def pulse(self, fade_in_time=1, fade_out_time=1, on_color=(1, 1, 1), off_color=(0, 0, 0), n=None, background=True):
        self.blink(0, 0, fade_in_time, fade_out_time, on_color, off_color, n, background)

    def close(self):
        if not self._closed:
            self._stop_blink()
            if self._pins:
                self._write((0, 0, 0))
        super().close()
