"""Pinnamen omzetten en pinnen claimen (BCM-nummering, zoals gpiozero)."""
from .exc import GPIOPinInUse, PinInvalidPin

# fysiek pinnummer (BOARD) -> GPIO/BCM-nummer
BOARD_TO_GPIO = {
    3: 2, 5: 3, 7: 4, 8: 14, 10: 15, 11: 17, 12: 18, 13: 27, 15: 22, 16: 23, 18: 24,
    19: 10, 21: 9, 22: 25, 23: 11, 24: 8, 26: 7, 29: 5, 31: 6, 32: 12, 33: 13,
    35: 19, 36: 16, 37: 26, 38: 20, 40: 21,
}
GPIO_MAX = 27

_claimed = {}


def parse_pin(spec):
    """Geeft het GPIO-nummer voor 17, "17", "GPIO17" of "BOARD11"."""
    invalid = PinInvalidPin("%r is not a valid pin name" % (spec,))
    if isinstance(spec, bool):
        raise invalid
    if isinstance(spec, int):
        if 0 <= spec <= GPIO_MAX:
            return spec
        raise invalid
    if isinstance(spec, str):
        text = spec.strip().upper()
        if text.startswith("BOARD"):
            number = text[5:]
            if number.isdigit() and int(number) in BOARD_TO_GPIO:
                return BOARD_TO_GPIO[int(number)]
            raise PinInvalidPin("%r is not a GPIO pin on the 40-pin header" % (spec,))
        if text.startswith("GPIO"):
            text = text[4:]
        if text.isdigit() and int(text) <= GPIO_MAX:
            return int(text)
    raise invalid


def claim(pin, device):
    if pin in _claimed:
        raise GPIOPinInUse("pin GPIO%d is already in use by %r" % (pin, _claimed[pin]))
    _claimed[pin] = device


def release(pin, device=None):
    if device is None or _claimed.get(pin) is device:
        _claimed.pop(pin, None)


def release_all():
    _claimed.clear()
