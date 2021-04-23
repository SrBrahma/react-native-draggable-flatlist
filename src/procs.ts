import Animated, {
  call,
  clockRunning,
  startClock,
  stopClock,
} from "react-native-reanimated";

const {
  set,
  cond,
  add,
  sub,
  block,
  eq,
  neq,
  and,
  divide,
  greaterThan,
  greaterOrEq,
  Value,
  spring,
  lessThan,
  lessOrEq,
  multiply,
} = Animated;
let { proc } = Animated;

if (!proc) {
  console.warn("Use reanimated > 1.3 for optimal perf");
  const procStub = <T>(cb: T) => cb;
  proc = procStub;
}

export const getIsAfterActive = proc(
  (currentIndex: Animated.Node<number>, activeIndex: Animated.Node<number>) =>
    greaterThan(currentIndex, activeIndex)
);

export const hardReset = proc(
  (
    position: Animated.Value<number>,
    finished: Animated.Value<number>,
    time: Animated.Value<number>,
    toValue: Animated.Value<number>
  ) =>
    block([set(position, 0), set(finished, 0), set(time, 0), set(toValue, 0)])
);

/**
 * The in react-native-reanimated.d.ts definition of `proc` only has generics
 * for up to 10 arguments. We cast it to accept any params to avoid errors when
 * type-checking.
 */
type RetypedProc = (cb: (...params: any) => Animated.Node<number>) => typeof cb;

export const setupCell = proc(
  (
    currentIndex: Animated.Value<number>,
    size: Animated.Node<number>,
    offset: Animated.Node<number>,
    isAfterActive: Animated.Value<number>,
    prevTrans: Animated.Value<number>,
    prevSpacerIndex: Animated.Value<number>,
    activeIndex: Animated.Node<number>,
    activeCellSize: Animated.Node<number>,
    hoverOffset: Animated.Node<number>,
    spacerIndex: Animated.Value<number>,
    toValue: Animated.Value<number>,
    position: Animated.Value<number>,
    time: Animated.Value<number>,
    finished: Animated.Value<number>,
    runSpring: Animated.Node<number>,
    onFinished: Animated.Node<number>,
    isPressedIn: Animated.Node<number>,
    placeholderOffset: Animated.Value<number>,
    prevIsPressedIn: Animated.Value<number>,
    clock: Animated.Clock
  ) =>
    block([
      // Determine whether this cell is after the active cell in the list
      set(isAfterActive, getIsAfterActive(currentIndex, activeIndex)),

      // Determining spacer index is hard to visualize, see diagram: https://i.imgur.com/jRPf5t3.jpg
      cond(
        isAfterActive,
        [
          cond(
            and(
              greaterOrEq(add(hoverOffset, activeCellSize), offset),
              lessThan(
                add(hoverOffset, activeCellSize),
                add(offset, divide(size, 2))
              )
            ),
            set(spacerIndex, sub(currentIndex, 1))
          ),
          cond(
            and(
              greaterOrEq(
                add(hoverOffset, activeCellSize),
                add(offset, divide(size, 2))
              ),
              lessThan(add(hoverOffset, activeCellSize), add(offset, size))
            ),
            set(spacerIndex, currentIndex)
          ),
        ],
        cond(lessThan(currentIndex, activeIndex), [
          cond(
            and(
              lessThan(hoverOffset, add(offset, size)),
              greaterOrEq(hoverOffset, add(offset, divide(size, 2)))
            ),
            set(spacerIndex, add(currentIndex, 1))
          ),
          cond(
            and(
              greaterOrEq(hoverOffset, offset),
              lessThan(hoverOffset, add(offset, divide(size, 2)))
            ),
            set(spacerIndex, currentIndex)
          ),
        ])
      ),
      // Set placeholder offset
      cond(eq(spacerIndex, currentIndex), [
        set(
          placeholderOffset,
          cond(isAfterActive, add(sub(offset, activeCellSize), size), offset)
        ),
      ]),
      cond(
        eq(currentIndex, activeIndex),
        [
          // If this cell is the active cell
          cond(
            isPressedIn,
            [
              // Set its position to the drag position
              set(position, sub(hoverOffset, offset)),
            ],
            [
              // Active item, not pressed in

              // Set value hovering element will snap to once released
              set(toValue, sub(placeholderOffset, offset)),
              cond(prevIsPressedIn, startClock(clock)),
            ]
          ),
        ],
        [
          // Not the active item
          // Translate cell down if it is before active index and active cell has passed it.
          // Translate cell up if it is after the active index and active cell has passed it.
          set(
            toValue,
            cond(
              cond(
                isAfterActive,
                lessOrEq(currentIndex, spacerIndex),
                greaterOrEq(currentIndex, spacerIndex)
              ),
              cond(isAfterActive, multiply(activeCellSize, -1), activeCellSize),
              0
            )
          ),
        ]
      ),
      cond(and(isPressedIn, neq(toValue, prevTrans)), [
        call([toValue, currentIndex], ([v, i]) =>
          console.log(`${i}: translate val:`, v)
        ),
        startClock(clock),
      ]),
      // Reset the spacer index when drag ends
      cond(eq(activeIndex, -1), set(spacerIndex, -1)),
      cond(neq(prevSpacerIndex, spacerIndex), [
        cond(eq(spacerIndex, -1), [
          // Hard reset to prevent stale state bugs
          cond(clockRunning(clock), stopClock(clock)),
          hardReset(position, finished, time, toValue),
        ]),
      ]),
      cond(finished, [onFinished, set(time, 0), set(finished, 0)]),
      set(prevSpacerIndex, spacerIndex),
      set(prevTrans, toValue),
      set(prevIsPressedIn, isPressedIn),
      cond(clockRunning(clock), runSpring),
      position,
    ])
);

const betterSpring = (proc as RetypedProc)(
  (
    finished: Animated.Value<number>,
    velocity: Animated.Value<number>,
    position: Animated.Value<number>,
    time: Animated.Value<number>,
    prevPosition: Animated.Value<number>,
    toValue: Animated.Value<number>,
    damping: Animated.Value<number>,
    mass: Animated.Value<number>,
    stiffness: Animated.Value<number>,
    overshootClamping: Animated.SpringConfig["overshootClamping"],
    restSpeedThreshold: Animated.Value<number>,
    restDisplacementThreshold: Animated.Value<number>,
    clock: Animated.Clock
  ) =>
    spring(
      clock,
      {
        finished,
        velocity,
        position,
        time,
        // @ts-ignore -- https://github.com/software-mansion/react-native-reanimated/blob/master/src/animations/spring.js#L177
        prevPosition,
      },
      {
        toValue,
        damping,
        mass,
        stiffness,
        overshootClamping,
        restDisplacementThreshold,
        restSpeedThreshold,
      }
    )
);

export function springFill(
  clock: Animated.Clock,
  state: Animated.SpringState,
  config: Animated.SpringConfig
) {
  return betterSpring(
    state.finished,
    state.velocity,
    state.position,
    state.time,
    new Value(0),
    config.toValue,
    config.damping,
    config.mass,
    config.stiffness,
    config.overshootClamping,
    config.restSpeedThreshold,
    config.restDisplacementThreshold,
    clock
  );
}