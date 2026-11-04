"""Vervangt time.sleep en signal.pause zodat de scheduler van de nep-gpiozero kan draaien."""
import signal
import time

from gpiozero import _scheduler


def _sleep(seconds):
    if seconds < 0:
        raise ValueError("sleep length must be non-negative")
    _scheduler.wait(seconds)


def install():
    time.sleep = _sleep
    signal.pause = _scheduler.run_forever
