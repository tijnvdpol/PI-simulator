from PIL import Image, ImageDraw


class canvas:
    """`with canvas(device) as draw:` geeft een zwart plaatje om op te tekenen (Pillow ImageDraw);
    na het blok wordt het getoond. Bij een fout in het blok wordt er niets getoond."""

    def __init__(self, device, background=None, dither=False):
        self.device = device
        self.image = Image.new(device.mode, device.size, 0 if background is None else background)
        self.draw = ImageDraw.Draw(self.image)

    def __enter__(self):
        return self.draw

    def __exit__(self, exc_type, exc_value, traceback):
        if exc_type is None:
            self.device.display(self.image)
        return False
