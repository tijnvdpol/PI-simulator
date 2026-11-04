class device:
    """Basis van alle schermen: afmetingen, modus en de rechthoek om te tekenen."""
    persist = False

    def __init__(self, serial_interface=None):
        self._serial_interface = serial_interface
        self.width = 0
        self.height = 0
        self.mode = "1"
        self.rotate = 0

    @property
    def size(self):
        return (self.width, self.height)

    @property
    def bounding_box(self):
        return (0, 0, self.width - 1, self.height - 1)

    def display(self, image):
        raise NotImplementedError

    def clear(self):
        from PIL import Image
        self.display(Image.new(self.mode, self.size))

    def show(self):
        pass

    def hide(self):
        pass

    def cleanup(self):
        self.hide()
        self.clear()
