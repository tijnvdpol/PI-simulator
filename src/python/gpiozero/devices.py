import _hw
from pyodide.ffi import to_js
from js import Object

from . import _pins
from .exc import DeviceClosed, GPIODeviceError


def kind_of(value):
    """JS geeft een tekst of undefined/null (jsnull) terug; alleen echte tekst telt."""
    return value if isinstance(value, str) else None


def warn(code, pin, device, found=None):
    info = {"pin": pin, "device": device}
    if found is not None:
        info["found"] = found
    _hw.warn(code, to_js(info, dict_converter=Object.fromEntries))


class Device:
    """Basisklasse: claimt een pin en controleert of er een onderdeel op de werkbank zit."""
    _part_kind = None   # 'led', 'button', 'buzzer', ... (None = niet controleren)

    def __init__(self, pin=None, *, pin_factory=None):
        self._pin = None
        self._closed = False
        if pin is None and self._part_kind is not None:
            raise GPIODeviceError("No pin specified: say which pin the %s is on, for example %s(17)" % (self._part_kind, type(self).__name__))
        if pin is not None:
            gpio = _pins.parse_pin(pin)
            _pins.claim(gpio, self)
            self._pin = gpio
            self._check_part()

    def _check_part(self):
        if self._part_kind is None:
            return
        found = kind_of(_hw.partKindAtGpio(self._pin))
        name = type(self).__name__
        if found is None:
            warn("pin-unconnected", str(self._pin), name)
        elif found != self._part_kind:
            warn("pin-wrong-kind", str(self._pin), name, found)

    def _check_open(self):
        if self._closed:
            raise DeviceClosed("%s is closed or uninitialized" % type(self).__name__)

    @property
    def pin(self):
        return self._pin

    @property
    def closed(self):
        return self._closed

    def close(self):
        if not self._closed:
            self._closed = True
            if self._pin is not None:
                _pins.release(self._pin, self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def __repr__(self):
        if self._closed:
            return "<gpiozero.%s object closed>" % type(self).__name__
        return "<gpiozero.%s object on pin GPIO%s>" % (type(self).__name__, self._pin)
