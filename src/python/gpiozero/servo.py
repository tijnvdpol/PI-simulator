import _hw

from .devices import Device
from .exc import OutputDeviceBadValue


class Servo(Device):
    """Servo met een stand van −1 (links) via 0 (midden) tot 1 (rechts); `None` = ontkoppeld.
    In de simulator draait de arm altijd over 180°; de pulsbreedtes worden alleen gecontroleerd."""
    _part_kind = "servo"

    def __init__(self, pin=None, *, initial_value=0.0, min_pulse_width=1 / 1000, max_pulse_width=2 / 1000, frame_width=20 / 1000, pin_factory=None):
        if min_pulse_width >= max_pulse_width:
            raise ValueError("max_pulse_width must be greater than min_pulse_width")
        if max_pulse_width >= frame_width:
            raise ValueError("frame_width must be greater than max_pulse_width")
        self._value = None
        self._min_pulse_width = min_pulse_width
        self._max_pulse_width = max_pulse_width
        self._frame_width = frame_width
        super().__init__(pin)
        try:
            self.value = initial_value
        except Exception:
            self.close()
            raise

    @property
    def value(self):
        self._check_open()
        return self._value

    @value.setter
    def value(self, v):
        self._check_open()
        if v is None:
            self._value = None
            _hw.writeServo(self._pin, None)
            return
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not -1 <= v <= 1:
            raise OutputDeviceBadValue("Servo value must be between -1 and 1, or None")
        self._value = v
        _hw.writeServo(self._pin, (v + 1) / 2)

    @property
    def is_active(self):
        return self._value is not None

    @property
    def min_pulse_width(self):
        return self._min_pulse_width

    @property
    def max_pulse_width(self):
        return self._max_pulse_width

    @property
    def frame_width(self):
        return self._frame_width

    def min(self):
        self.value = -1

    def mid(self):
        self.value = 0

    def max(self):
        self.value = 1

    def detach(self):
        self.value = None

    def close(self):
        if not self._closed and self._pin is not None:
            _hw.writeServo(self._pin, None)
        super().close()


class AngularServo(Servo):
    """Servo die je op een hoek zet (standaard −90° … 90°)."""

    def __init__(self, pin=None, *, initial_angle=0.0, min_angle=-90, max_angle=90, min_pulse_width=1 / 1000, max_pulse_width=2 / 1000,
                 frame_width=20 / 1000, pin_factory=None):
        self._min_angle = min_angle
        self._max_angle = max_angle
        if min_angle == max_angle:
            raise ValueError("min_angle and max_angle must differ")
        super().__init__(pin, initial_value=None, min_pulse_width=min_pulse_width, max_pulse_width=max_pulse_width, frame_width=frame_width)
        try:
            self.angle = initial_angle
        except Exception:
            self.close()
            raise

    @property
    def min_angle(self):
        return self._min_angle

    @property
    def max_angle(self):
        return self._max_angle

    @property
    def angle(self):
        v = self.value
        if v is None:
            return None
        return self._min_angle + (self._max_angle - self._min_angle) * (v + 1) / 2

    @angle.setter
    def angle(self, a):
        self._check_open()
        if a is None:
            self.value = None
            return
        lo, hi = sorted((self._min_angle, self._max_angle))
        if isinstance(a, bool) or not isinstance(a, (int, float)) or not lo <= a <= hi:
            raise OutputDeviceBadValue("AngularServo angle must be between %s and %s, or None" % (self._min_angle, self._max_angle))
        self.value = 2 * (a - self._min_angle) / (self._max_angle - self._min_angle) - 1

    def min(self):
        self.angle = self._min_angle

    def mid(self):
        self.value = 0

    def max(self):
        self.angle = self._max_angle
