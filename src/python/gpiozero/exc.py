"""Uitzonderingen, dezelfde namen als de echte gpiozero."""


class GPIOZeroError(Exception):
    pass


class DeviceClosed(GPIOZeroError):
    pass


class GPIODeviceError(GPIOZeroError):
    pass


class GPIOPinInUse(GPIODeviceError):
    pass


class GPIOPinMissing(GPIODeviceError, ValueError):
    pass


class OutputDeviceError(GPIODeviceError):
    pass


class OutputDeviceBadValue(OutputDeviceError, ValueError):
    pass


class PinError(GPIOZeroError):
    pass


class PinInvalidPin(PinError, ValueError):
    pass


class BadPinFactory(GPIOZeroError, ImportError):
    pass


class SPIError(GPIOZeroError):
    pass


class SPIBadChannel(SPIError):
    pass
