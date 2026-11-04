"""Zet de nep-hardware terug naar een schone toestand (voor elke run)."""
from gpiozero import _pins, _scheduler


def reset():
    _pins.release_all()
    _scheduler.reset()
