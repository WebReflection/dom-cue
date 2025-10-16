__all__ = ['Signal', 'signal', 'Computed', 'computed', 'effect', 'batch', 'untracked']

class Set(list):
    """
    Strictly mimicking the JS Set class
    allowing operations otherwise hard to obtain
    with just the `list` class (such as remove(item))
    and hard to guarantee stable iteration order
    when using a `set` subclass instead
    """

    def add(self, value):
        """
        Add a value to the set if not present.
        Preserves insertion order.
        """
        for item in self:
            if item is value:
                return self

        self.append(value)

    def discard(self, value):
        """
        Remove a value from the set if present.
        """
        i = -1

        for item in self:
            i += 1

            if item is value:
                break

        if i != -1:
          self.pop(i)


def cleared(self):
    """
    Clears the set and returns a copy of the items
    """
    computed = list(self)
    self.clear()
    return computed


# used to store computed signals that need to be updated
batched = Set()

# whether the current computation is synchronous (not batched)
synchronous = True

# whether the current computation is being tracked
tracked = True

# the current computed signal used to subscribe
computing = None


class Signal(Set):
    """
    A signal is a value that can be subscribed to and
    be notified when it changes.
    """

    def __init__(self, value):
        super().__init__()
        self._value = value

    def __eq__(self, other):
        return id(self) == id(other)

    def __hash__(self):
        return hash(repr(self))

    def __str__(self):
        return str(self.value)

    def __repr__(self):
        return f"<Signal <{repr(self._value)}> at {hex(id(self))}>"

    @property
    def value(self):
        if tracked and computing is not None:
            computing.add(self)
            self.add(computing)

        return self._value

    @value.setter
    def value(self, value):
        if self._value is not value:
            self._value = value
            for computed in cleared(self):
                computed._update()

    def peek(self):
        return self._value


# create a signal with the given value
signal = lambda value: Signal(value)


class Computed(Signal):
    """
    A computed signal is a read-only signal function that
    automatically subscribes to the signals it depends on
    and returns its updated value once any of these change.
    """

    def __init__(self, value, fx=False):
        super().__init__(value)
        self._compute = True
        self._computed = None
        self._subscribe = not fx

    def __repr__(self):
        name = "Computed" if self._subscribe else "Effect"
        return f"<{name} <{repr(self._computed)}> at {hex(id(self))}>"

    def _run(self):
        global computing

        if (self._compute):
            previously = computing
            computing = self
            self._compute = False
            self.clear()
            try:
                self._computed = self._value()
            finally:
                computing = previously

    def _update(self):
        self._compute = True

        if synchronous:
            self._subscribe or self._run()
        else:
            batched.add(self)

    @property
    def value(self):
        self._run()

        if self._subscribe and tracked and computing is not None:
            for signal in cleared(self):
                computing.add(signal)
                signal.add(computing)

        return self._computed

    def peek(self):
        self._run()
        return self._computed


# create a computed signal via the given getter
computed = lambda value: Computed(value)


def effect(callback):
    """
    An effect is a callback that is automatically called when its signals change.
    """

    value = None

    def effect():
        nonlocal value

        if callable(value):
            value()

        value = callback()

    def cleanup():
        for signal in cleared(fx):
            signal.discard(fx)

        if callable(value):
            value()

    fx = Computed(effect, fx=True)
    fx.value

    return cleanup


def batch(callback):
    """
    Run the callback without tracking its signals
    during its execution, combining all updates into a single batch.
    """

    global synchronous

    finalize = synchronous
    synchronous = False

    try:
        callback()
        if finalize and len(batched):
            synchronous = finalize

            for batch in cleared(batched):
                if batch._compute:
                    batch._update()

    finally:
        synchronous = finalize


def untracked(callback):
    """
    Run the callback without tracking its signals at all.
    """
    global tracked

    tracking = tracked
    tracked = False
    try:
        return callback()
    finally:
        tracked = tracking



# # test

# s = signal(1)
# c = computed(lambda: s.value * 2)

# assert c.value == 2
# s.value += 1
# assert c.value == 4

# @effect
# def counter():
#     print('effect', c.value)
#     return lambda: print("unmounted")


# @batch
# def increment():
#     s.value += 1
#     s.value += 1

# assert c.value == 8

# counter()

# s.value += 1
# assert c.value == 10
