"""Uitzonderingen, dezelfde namen als luma.core."""


class Error(Exception):
    pass


class DeviceNotFoundError(Error):
    pass


class DevicePermissionError(Error):
    pass


class DeviceDisplayModeError(Error):
    pass


class UnsupportedPlatform(Error):
    pass
