"""Vervangt time.sleep en signal.pause zodat de scheduler van de nep-gpiozero kan draaien."""
import builtins
import signal
import time

from gpiozero import _scheduler


def _sleep(seconds):
    if seconds < 0:
        raise ValueError("sleep length must be non-negative")
    _scheduler.wait(seconds)


class InputNietBeschikbaar(Exception):
    """input() kan in de simulator niet (er is geen toetsenbord voor het programma)."""


def _input(prompt=""):
    raise InputNietBeschikbaar("input() is not available in the simulator")


def install():
    builtins.input = _input
    time.sleep = _sleep
    signal.pause = _scheduler.run_forever
