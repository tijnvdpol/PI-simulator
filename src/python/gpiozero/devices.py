import _hw
from pyodide.ffi import to_js
from js import Object

from . import _pins
from .exc import DeviceClosed, GPIODeviceError, GPIOPinInUse


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
    _also_ok = ()       # andere onderdeelsoorten waar deze klasse ook op mag zitten (LED op een dimbare led)

    def __init__(self, pin=None, *, pin_factory=None):
        self._pin = None
        self._pins = []
        self._closed = False
        if pin is None and self._part_kind is not None:
            raise GPIODeviceError("No pin specified: say which pin the %s is on, for example %s(17)" % (self._part_kind, type(self).__name__))
        if pin is not None:
            self._pin = self._attach_pin(pin)

    def _attach_pin(self, spec):
        """Claimt een pin en controleert of er het juiste onderdeel op de werkbank zit. Geeft het GPIO-nummer."""
        gpio = _pins.parse_pin(spec)
        _pins.claim(gpio, self)
        self._pins.append(gpio)
        self._check_part(gpio)
        return gpio

    def _attach_pins(self, specs):
        """Meerdere pinnen in één keer; bij een fout komen de al geclaimde pinnen weer vrij."""
        try:
            return [self._attach_pin(s) for s in specs]
        except Exception:
            self._release_pins()
            raise

    def _release_pins(self):
        for gpio in self._pins:
            _pins.release(gpio, self)
        self._pins = []

    def _check_part(self, gpio=None):
        if self._part_kind is None:
            return
        gpio = self._pin if gpio is None else gpio
        found = kind_of(_hw.partKindAtGpio(gpio))
        name = type(self).__name__
        if found is None:
            warn("pin-unconnected", str(gpio), name)
        elif found != self._part_kind and found not in self._also_ok:
            warn("pin-wrong-kind", str(gpio), name, found)

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
            self._release_pins()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def __repr__(self):
        if self._closed:
            return "<gpiozero.%s object closed>" % type(self).__name__
        return "<gpiozero.%s object on pin GPIO%s>" % (type(self).__name__, self._pin)
