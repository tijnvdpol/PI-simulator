"""Nep-gpiozero voor de Pi-simulator: dezelfde API als de echte bibliotheek."""
from .exc import *  # noqa: F401,F403
from .output import Buzzer, LED  # noqa: F401
from .input import Button  # noqa: F401
from .analog import MCP3008  # noqa: F401
